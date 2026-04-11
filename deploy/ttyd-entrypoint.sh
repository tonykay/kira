#!/bin/bash
# ttyd entrypoint — starts ttyd serving the session wrapper

exec ttyd \
    --port 7681 \
    --writable \
    ttyd-session.sh
