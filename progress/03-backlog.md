# Backlog

## Plugin Runtime

- Wire component policy rule injection into the live runtime so preserved instances are not always the default.
- Expand runtime extraction coverage for vectors, boolean operations, layout grids, and mixed-text cases.
- Add richer runtime diagnostics where command failures need more than a single error string.

## CLI Companion

- Add optional file-based session or latest-capture persistence only if a concrete workflow requires it.
- Add optional raster or browser-rendered snapshot output if pixel-oriented review becomes worth the added cost.
- Add session selection ergonomics for multiple simultaneous plugin windows if that becomes a routine workflow.

## Compatibility

- Delete or archive the deferred V1 `ui-bridge` and `mcp-server` code once no transition value remains.
- Add a thin MCP adapter only if a later compatibility requirement proves it is worth the cost.

## Fixtures And Testing

- Add golden fixtures for larger selections and page-level capture.
- Add integration coverage for reconnect behavior and command failure handling.
- Expand live smoke assertions around specific node families once their runtime extraction is implemented.
