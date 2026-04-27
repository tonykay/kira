#!/bin/bash
# ttyd entrypoint — starts 3 ttyd instances
# Port 7681: ticket-context terminal (receives args from iframe URL)
# Port 7682: workspace terminal 1 (persistent plain bash)
# Port 7683: workspace terminal 2 (persistent plain bash)
#
# TTYD_FONT_SIZE: optional env var to set font size (default: 13)

FONT_ARGS=""
if [ -n "${TTYD_FONT_SIZE}" ]; then
    FONT_ARGS="--font-size ${TTYD_FONT_SIZE}"
fi

# Start workspace terminals in background (plain bash, no ticket context)
ttyd --port 7682 --writable ${FONT_ARGS} bash &
ttyd --port 7683 --writable ${FONT_ARGS} bash &

# Start ticket-context terminal in foreground (receives args via iframe URL)
exec ttyd --port 7681 --writable ${FONT_ARGS} ttyd-session.sh
