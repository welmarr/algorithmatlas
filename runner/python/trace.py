"""Local isolated Python tracing protocol. Host isolation is enforced by Docker."""

import ast
import builtins
import contextlib
import io
import json
import resource
import sys

MAX_SOURCE = 4096
MAX_INPUT = 16384
MAX_TRACE = 800
MAX_STDOUT = 8192
ALLOWED_MODULES = {"math", "collections", "heapq", "bisect", "itertools", "functools"}
resource.setrlimit(resource.RLIMIT_AS, (96 * 1024 * 1024, 96 * 1024 * 1024))

class PolicyRejected(Exception):
    pass


class TraceLimit(Exception):
    pass


class OutputLimit(Exception):
    pass


class LimitedWriter(io.StringIO):
    def write(self, value):
        if self.tell() + len(value) > MAX_STDOUT:
            raise OutputLimit("Program output exceeded 8 KiB")
        return super().write(value)


def safe_value(value):
    try:
        result = json.dumps(value, allow_nan=False, separators=(",", ":"))
    except (TypeError, ValueError, OverflowError):
        result = f"<{type(value).__name__}>"
    return result[:160]


def limited_import(name, globals=None, locals=None, fromlist=(), level=0):
    if level or name.split(".")[0] not in ALLOWED_MODULES:
        raise ImportError("Module is not allowed in this educational runner")
    return builtins.__import__(name, globals, locals, fromlist, level)


def user_builtins():
    names = (
        "abs", "all", "any", "bool", "dict", "enumerate", "filter", "float",
        "int", "isinstance", "len", "list", "map", "max", "min", "pow", "print",
        "range", "reversed", "round", "set", "sorted", "str", "sum", "tuple", "zip",
        "Exception", "ValueError", "TypeError", "IndexError", "KeyError",
    )
    selected = {name: getattr(builtins, name) for name in names}
    selected["__import__"] = limited_import
    return selected


def validate_source(source):
    if not isinstance(source, str) or not source.strip() or len(source) > MAX_SOURCE:
        raise ValueError("Source must contain 1–4096 characters")
    tree = ast.parse(source, filename="submission.py")
    forbidden = (ast.Global, ast.Nonlocal, ast.AsyncFunctionDef, ast.Await,
                 ast.Yield, ast.YieldFrom)
    for node in ast.walk(tree):
        if isinstance(node, forbidden):
            raise PolicyRejected(f"Unsupported syntax: {type(node).__name__}")
        if isinstance(node, ast.Attribute) and node.attr.startswith("_"):
            raise PolicyRejected("Private attributes are not supported")
        if isinstance(node, ast.Name) and (node.id.startswith("__") or node.id in {"open", "eval", "exec", "compile", "input", "breakpoint", "getattr", "setattr", "delattr", "globals", "locals", "vars"}):
            raise PolicyRejected("NameError: this builtin is not available")
    if not any(isinstance(node, ast.FunctionDef) and node.name == "solve" for node in tree.body):
        raise ValueError("Define solve(data) as a top-level function")
    return compile(tree, "submission.py", "exec")


def run(request):
    source = request.get("source")
    data = request.get("input")
    if len(json.dumps(data)) > MAX_INPUT:
        raise ValueError("Input exceeds 16 KiB")
    code = validate_source(source)
    namespace = {"__name__": "__submission__", "__builtins__": user_builtins()}
    trace = []
    previous = {}
    writer = LimitedWriter()

    def observe(frame, event, arg):
        if frame.f_code.co_filename != "submission.py":
            return observe
        if event not in ("line", "return"):
            return observe
        if len(trace) >= MAX_TRACE:
            raise TraceLimit("Trace exceeded 800 events")
        variables = {
            name: safe_value(value)
            for name, value in list(frame.f_locals.items())[:16]
            if not name.startswith("__") and not callable(value)
        }
        changes = {
            name: value for name, value in variables.items()
            if previous.get(name) != value
        }
        previous.update(variables)
        serialized = json.dumps(changes, separators=(",", ":"))
        if len(serialized) > 512:
            serialized = '{"_truncated":"Local state exceeded trace budget"}'
        trace.append({
            "schemaVersion": "0.1",
            "operation": "return" if event == "return" else "line",
            "data": {"line": frame.f_lineno, "changes": serialized},
            "sourceRef": {"file": "submission.py", "line": frame.f_lineno},
        })
        return observe

    with contextlib.redirect_stdout(writer):
        sys.settrace(observe)
        try:
            exec(code, namespace, namespace)
            output = namespace["solve"](data)
        finally:
            sys.settrace(None)
    try:
        json.dumps(output, allow_nan=False)
    except (TypeError, ValueError):
        raise ValueError("solve(data) must return a JSON-compatible value")
    return {"status": "ok", "output": output, "stdout": writer.getvalue(), "rawTrace": trace}


def main():
    try:
        raw = sys.stdin.read(MAX_SOURCE + MAX_INPUT + 1024)
        if len(raw) >= MAX_SOURCE + MAX_INPUT + 1024:
            raise ValueError("Request is too large")
        request = json.loads(raw)
        if not isinstance(request, dict):
            raise ValueError("Request must be an object")
        result = run(request)
    except (TraceLimit, OutputLimit, MemoryError) as cause:
        code = "PYTHON_TRACE_LIMIT" if isinstance(cause, TraceLimit) else "PYTHON_OUTPUT_LIMIT" if isinstance(cause, OutputLimit) else "PYTHON_MEMORY_LIMIT"
        result = {"status": "limit", "code": code, "error": str(cause)[:512], "stdout": "", "rawTrace": []}
    except (PolicyRejected, ImportError) as cause:
        result = {"status": "error", "code": "PYTHON_POLICY_REJECTED", "error": f"{type(cause).__name__}: {cause}"[:512], "stdout": "", "rawTrace": []}
    except Exception as cause:
        line = cause.lineno if isinstance(cause, SyntaxError) else None
        frame = cause.__traceback__
        while frame:
            if frame.tb_frame.f_code.co_filename == "submission.py":
                line = frame.tb_lineno
            frame = frame.tb_next
        result = {"status": "error", "code": "PYTHON_SYNTAX_ERROR" if isinstance(cause, SyntaxError) else "PYTHON_RUNTIME_ERROR", "errorLine": line, "error": f"{type(cause).__name__}: {cause}"[:512], "stdout": "", "rawTrace": []}
    print(json.dumps(result, allow_nan=False, separators=(",", ":")))


if __name__ == "__main__":
    main()
