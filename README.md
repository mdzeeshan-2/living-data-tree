# Living Data Tree

A self-contained React + Canvas visualization that turns incoming bias values into a living, evolving tree.

No APIs, databases, or keys. Data is fed from the right-hand panel or a local simulation.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints, usually [http://localhost:5173](http://localhost:5173).

## Use

1. Keep the default timestamp `09:30` and biases `-20`, `-5`, `+3`.
2. Click **Send Data**. Three stems grow from the trunk.
3. Click **Send Data** again (timestamp advances) to evolve the same branches.
4. Use **Random Data**, presets, or **Start** to watch the organism keep growing.
5. **Create New Tree** starts another 4-hour session. Older trees stay in the background.
6. Hover a branch for inspection. Click to isolate a source. Wheel/drag to zoom and pan.

## Architecture

Incoming events go through `DataProvider` → `DataProcessor` → `TreeEngine` → Canvas renderer.

Later you can replace `SimulationProvider` with a websocket or API subscriber without rewriting the tree.
