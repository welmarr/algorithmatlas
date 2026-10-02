FROM python:3.12-alpine

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONHASHSEED=0
WORKDIR /runner
COPY trace.py /runner/trace.py
RUN chmod 0444 /runner/trace.py
USER 65534:65534
ENTRYPOINT ["python", "-I", "-S", "/runner/trace.py"]
