const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");

const s3 = new S3Client();

const Bucket = "";

const { readFile, writeFile } = require("fs/promises");

async function saveS3File(path, content) {
  const command = new PutObjectCommand({
    Bucket,
    Key: path,
    Body: content,
  });
  return s3.send(command);
}

async function getFile(path) {
  const command = new GetObjectCommand({
    Bucket,
    Key: path,
  });
  return s3.send(command);
}

const sampleGraph = {
  nodes: [
    {
      key: "diego",
      label: "User",
      to: [
        {
          key: "megan",
          rel: "papa",
        },
        {
          key: "maxi",
          rel: "papa",
        },
        {
          key: "moni",
          rel: "esposo",
        },
      ],
    },
    {
      id: "megan",
      label: "user",
      to: [],
    },
  ],
};

class Graph {
  #nodes = [];

  /**
   * Load a graph from a given path, either a local path or an s3 path
   *
   * @static
   * @param {string} path
   * @memberof GNode
   */
  static load(path) {
    // [ ] load from local file

    // [ ] load from s3 folder
    if (path.startsWith("s3://")) {
      const bucket = path.replace("s3://", "").split(/[\/]/g).shift();

      console.log("bucket", bucket);
    }
  }

  constructor(s3Client) {}

  /**
   * Save the graph in a given path, this can be local file or an s3 bucket
   *
   * @param {string} path
   * @memberof GNode
   */
  async save(path) {
    // [ ] save to local file
    if (path.startsWith("./") || path.startsWith("../")) {
      console.log('this.toJson()', JSON.stringify(this.toJson(), null, 2))
      // const res = await writeFile(path, JSON.stringify(this.toJson()));
      // console.log("save file res", res);
    }

    // [ ] save to s3 folder
    if (path.startsWith("s3://")) {
      // const bucket = path.replace("s3://", "").split(/[\/]/g).shift();
      // console.log("bucket", bucket);
    }
  }

  /**
   * register a node in a graph
   *
   * @param {GNode} node
   * @memberof Graph
   */
  register(node) {
    this.#nodes.push(node);

    return this;
  }

  /**
   * remove a node from a graph
   *
   * @param {GNode} node
   * @memberof Graph
   */
  remove(node) {
    // [ ] search and remove the node
    // [ ] clean relationships
  }

  /**
   * find paths between 2 nodes
   *
   * @param {GNode} start
   * @param {GNode} destination
   * @param {GNode} options
   * @memberof Graph
   */
  findPaths(start, destination, options) {}

  /**
   * find paths between 2 nodes using bread first search
   *
   * @param {GNode} start
   * @param {GNode} destination
   * @param {GNode} [options]
   * @memberof Graph
   */
  wideSearch(start, destination, options) {
    const queue = [[start]];
    const visited = new Set();
    const allPaths = [];

    while (queue.length > 0) {
      const path = queue.shift();
      if (!path) throw new Error("no path");
      const node = path[path.length - 1];

      if (node === destination) {
        allPaths.push(path); // Found a path to the destination
        continue; // Continue searching for other paths
      }

      if (!visited.has(node.key)) {
        visited.add(node.key);

        // Explore outgoing edges
        for (const { node: nextNode, rel } of node.out) {
          if (!path.includes(nextNode)) {
            // Avoid cycles in the current path
            queue.push([...path, nextNode]);
          }
        }

        // Explore bidirectional edges
        for (const { node: nextNode, rel } of node.bidirectional) {
          if (!path.includes(nextNode)) {
            // Avoid cycles in the current path
            queue.push([...path, nextNode]);
          }
        }
      }
    }

    return allPaths.length > 0 ? allPaths : null; // Return all paths or null if none found
  }

  /**
   * find paths between 2 nodes using deep first seach
   *
   * @param {GNode} start
   * @param {GNode} destination
   * @param {GNode} [options]
   * @memberof Graph
   */
  deepSearch(start, destination, options) {
    const visited = new Set();
    const allPaths = [];

    function dfs(currentNode, path) {
      visited.add(currentNode.key);
      path.push(currentNode);

      if (currentNode === destination) {
        allPaths.push([...path]); // Found a path, add a copy to allPaths
      } else {
        // Explore outgoing edges
        for (const { node: nextNode } of currentNode.out) {
          if (!visited.has(nextNode.key)) {
            dfs(nextNode, path);
          }
        }

        // Explore bidirectional edges
        for (const { node: nextNode } of currentNode.bidirectional) {
          if (!visited.has(nextNode.key)) {
            dfs(nextNode, path);
          }
        }
      }

      // Backtrack
      visited.delete(currentNode.key);
      path.pop();
    }

    dfs(start, []);

    return allPaths.length > 0 ? allPaths : null; // Return all paths or null if none found
  }

  // [ ] implement a way to match patterns
  /**
   * receive a match query string similar to cypher match query
   *
   * @example
   * graph.match('()-[papa]->()') // returns (diego)-[papa]->(megan), (horacio)-[papa]->(diego), (diego)-[papa]->(maxi)
   *
   * @param {string} matchQuery
   * @memberof Graph
   */
  match(matchQuery) {
    // Remove whitespace and split the query into parts
    const parts = matchQuery
      .replace(/\s/g, "")
      .match(/(\([^\)]*\))|(\[[^\]]*\])|(-+>?)/g);
    console.log("PARTS:", parts);

    // [ ] make this function work with variable amount of relationships, not only ()-[]->()
    // [ ] make the directions work

    if (!parts || parts.length < 3) {
      throw new Error("Invalid match query format");
    }

    const startNode = parts[0];
    const endNode = parts[parts.length - 1];
    const relationship = parts.slice(1, -1).join("");

    const rel = relationship.match(/\[(.*?)\]/)?.[1] || "";

    const results = [];

    for (const node of this.#nodes) {
      // Check outgoing relationships
      for (const { node: targetNode, rel: edgeRel } of node.out) {
        if (
          this.matchesPattern(
            node,
            targetNode,
            edgeRel,
            startNode,
            endNode,
            rel
          )
        ) {
          results.push(`(${node.key})-[${edgeRel}]->(${targetNode.key})`);
        }
      }

      // Check bidirectional relationships
      for (const { node: targetNode, rel: edgeRel } of node.bidirectional) {
        if (
          this.matchesPattern(
            node,
            targetNode,
            edgeRel,
            startNode,
            endNode,
            rel
          )
        ) {
          results.push(`(${node.key})-[${edgeRel}]-(${targetNode.key})`);
        }
      }
    }

    return results;
  }

  matchesPattern(
    sourceNode,
    targetNode,
    edgeRel,
    startPattern,
    endPattern,
    relPattern
  ) {
    const matchesNode = (node, pattern) => {
      if (pattern === "()") return true;
      const nodeKey = pattern.slice(1, -1);
      return nodeKey === "" || node.key === nodeKey;
    };

    return (
      matchesNode(sourceNode, startPattern) &&
      matchesNode(targetNode, endPattern) &&
      (relPattern === "" || edgeRel === relPattern)
    );
  }

  /**
   * like neo4j, this match a pattern and add the new stuff
   *
   * @memberof GNode
   */
  merge() {
    // [ ] implement merge
  }

  toString() {
    return this.#nodes.map((node) => node.toString()).join("\n");
  }

  toJson() {
    return {
      key: "",
      nodes: this.#nodes.map((node) => node.toJson()),
    };
  }

  toMermaid() {
    const direction = "TD";
    const mermaidCode = `\`\`\`mermaid
graph ${direction}
  ${this.#nodes.map((node) => node.toMermaid()).join("  \n")}
    
\`\`\``;

    return mermaidCode;
  }
}

/**
 * This class represent a node in a graph.
 * [ ] add support for more properties
 *
 * @class GNode
 */
class GNode {
  out = [];
  #in = [];
  bidirectional = [];

  static fromJson(json) {}

  constructor(key, props = {}) {
    this.key = key;
    this.props = { ...props };
  }

  to(node, rel) {
    this.out.push({ node, rel });
    node.from(this, rel);
    return this;
  }

  from(node, rel) {
    this.#in.push({ node, rel });
    return this;
  }

  between(node, rel) {
    this.bidirectional.push({ node, rel });
    node.between(this, rel);
    return this;
  }

  toString() {
    return this.out
      .map(({ node, rel }) => `(${this.key})-[${rel}]->(${node.key})`)
      .join("\n");
  }

  toJson() {
    return {
      key: this.key,
      out: this.out.map((link) => link.key),
      in: this.#in.map((link) => link.key),
      bidirectional: this.bidirectional.map((link) => link.key),
    };
  }

  toMermaid() {
    return this.out
      .map(({ node, rel }) => `${this.key}--${rel}-->${node.key}`)
      .join("  \n");
  }
}

// Graph.load('')

// return

const graph = new Graph();

const diego = new GNode("diego");
const moni = new GNode("moni");
const megan = new GNode("megan");
const maxi = new GNode("maxi");
const horacio = new GNode("horacio");

graph
  .register(moni)
  .register(diego)
  .register(megan)
  .register(maxi)
  .register(horacio);

moni.to(maxi, "mama").to(diego, "esposa").to(megan, "mama");
megan.to(diego, "hija").to(maxi, "hermana").to(moni, "hija");
maxi.to(diego, "hijo").to(megan, "hermano").to(moni, "hijo");
diego.to(megan, "papa").to(maxi, "papa").to(moni, "esposo");

horacio.to(diego, "papa");

console.log(graph.toString());
console.log("----------------------");
console.log(graph.toJson());
console.log("----------------------");
console.log(graph.toMermaid());
console.log("----------------------");

console.log();

// const paths = graph.wideSearch(horacio, megan);
const paths = graph.deepSearch(horacio, megan);
if (paths) {
  console.log(`Found ${paths.length} path(s):`);
  paths.forEach((path, index) => {
    console.log(
      `Path ${index + 1}:`,
      path.map((node) => node.key).join(" -> ")
    );
  });
} else {
  console.log("No paths found");
}

console.log("----------------------");

// const query = '()-[papa]->()-[papa]-()'
// const query = '()-[papa]->()'
const query = "()-[papa]->(diego)";
const matchResults = graph.match(query);
console.log(matchResults);

graph.save("./graph.json");

/*
COMMENT: this distinction is imporntant BFS and DFS


The choice between Breadth-First Search (BFS) and Depth-First Search (DFS) depends on the specific problem you're trying to solve and the characteristics of your graph. Here are some guidelines on when to prefer one over the other: [1]

Use Breadth-First Search (BFS) when: [2]

Finding the shortest path: If you need to find the shortest path between two nodes (in terms of the number of edges), BFS is generally better. It explores all nodes at the current depth before moving to the next level.

Exploring nodes near the starting point: BFS is ideal when you want to find all nodes within a certain distance from the start.

Level-wise traversal: When you need to process nodes level by level, such as in a tree structure.

Detecting cycles in an undirected graph: BFS can be more efficient for this task.

Memory is not a constraint: BFS typically requires more memory as it needs to store all nodes at the current level.

Use Depth-First Search (DFS) when:

Exploring all possible paths: DFS is better for exhaustive searches, especially when you need to visit every node in the graph.

Memory is limited: DFS generally requires less memory than BFS, especially for deep graphs. [3]

Solving maze-like problems: DFS is often used in problems where you need to explore as far as possible along each branch before backtracking.

Topological sorting: DFS is commonly used for topological sorting of a directed acyclic graph.

Detecting cycles in a directed graph: DFS is often preferred for cycle detection in directed graphs.

Generating permutations or combinations: The backtracking nature of DFS makes it suitable for these tasks.

Other considerations:

Graph structure: If your graph is wide and shallow, BFS might be more efficient. If it's narrow and deep, DFS could be better.

Solution location: If you expect the solution to be far from the starting point, DFS might find it faster. If it's likely to be close, BFS could be quicker.

Completeness: BFS is complete and will find a solution if one exists (assuming a finite graph). DFS might get stuck in an infinite path in infinite graphs.

In your specific case, if you're looking for the shortest connection between two people in a social network-like graph, BFS would typically be the better choice. However, if you're trying to explore all possible connections or paths between two nodes, regardless of length, DFS could be more appropriate.

Remember, the efficiency of these algorithms can also depend on the specific implementation and the structure of your graph. In some cases, a hybrid approach or a modified version of these algorithms might be the best solution.

*/
