FROM python:3.12-alpine@sha256:0687a6bc9716edc2a6ee0fbfb0f87e7ee358b262b67c9215de91bc9b2d38ba71

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONHASHSEED=0
WORKDIR /runner
COPY trace.py /runner/trace.py
RUN chmod 0444 /runner/trace.py
USER 65534:65534
ENTRYPOINT ["python", "-I", "-S", "/runner/trace.py"]
