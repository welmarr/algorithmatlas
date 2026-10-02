export const pythonExamples = {
  array: {
    name: "Increasing Array",
    input: { values: [8, 2, 5, 1, 7] },
    source: `def solve(data):
    values = data["values"]
    moves = 0
    for i in range(1, len(values)):
        if values[i] < values[i - 1]:
            moves += values[i - 1] - values[i]
            values[i] = values[i - 1]
    return moves`,
  },
  graph: {
    name: "Shortest paths",
    input: {
      nodes: [0, 1, 2],
      edges: [
        [0, 1, 4],
        [0, 2, 9],
        [1, 2, 2],
      ],
    },
    source: `def solve(data):
    dist = [0, 999, 999]
    for repeat in range(len(data["nodes"]) - 1):
        for u, v, weight in data["edges"]:
            if dist[u] + weight < dist[v]:
                dist[v] = dist[u] + weight
    return dist`,
  },
  raw: {
    name: "Variables & raw trace",
    input: { limit: 5 },
    source: `def solve(data):
    total = 0
    for n in range(data["limit"]):
        total += n * n
    return total`,
  },
};
