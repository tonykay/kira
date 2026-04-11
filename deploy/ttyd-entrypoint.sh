#!/bin/bash
# ttyd entrypoint — starts ttyd serving the session wrapper

exec ttyd \
    --port 7681 \
    --writable \
    --base-path /ttyd \
    ttyd-session.sh
