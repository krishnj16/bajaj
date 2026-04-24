const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/bfhl', (req, res) => {
    try {
        const data = req.body.data;
        if (!Array.isArray(data)) {
            return res.status(400).json({ error: "Invalid request format. 'data' must be an array." });
        }

        const invalid_entries = [];
        const duplicateSet = new Set();
        const valid_edges = [];
        
        const seen_edges = new Set();
        
        for (let entry of data) {
            if (typeof entry !== 'string') {
                invalid_entries.push(String(entry));
                continue;
            }
            
            let trimmed = entry.trim();
            if (!/^[A-Z]->[A-Z]$/.test(trimmed)) {
                invalid_entries.push(entry);
                continue;
            }
            
            let parent = trimmed[0];
            let child = trimmed[3];
            
            if (parent === child) {
                invalid_entries.push(entry);
                continue;
            }
            
            if (seen_edges.has(trimmed)) {
                duplicateSet.add(trimmed);
                continue;
            }
            
            seen_edges.add(trimmed);
            valid_edges.push({ u: parent, v: child, original: trimmed });
        }
        
        const parentMap = new Map();
        const acceptedEdges = [];
        
        for (let edge of valid_edges) {
            if (parentMap.has(edge.v)) {
                continue;
            }
            parentMap.set(edge.v, edge.u);
            acceptedEdges.push(edge);
        }
        
        const nodes = new Set();
        for (let edge of acceptedEdges) {
            nodes.add(edge.u);
            nodes.add(edge.v);
        }
        
        const adj = new Map();
        for (let node of nodes) {
            adj.set(node, []);
        }
        
        for (let edge of acceptedEdges) {
            adj.get(edge.u).push(edge.v);
        }
        
        const roots = [];
        for (let node of nodes) {
            let isChildInAcceptedEdge = false;
            for (let edge of acceptedEdges) {
                if (edge.v === node) {
                    isChildInAcceptedEdge = true;
                    break;
                }
            }
            if (!isChildInAcceptedEdge) {
                roots.push(node);
            }
        }
        
        const visited = new Set();
        const hierarchies = [];
        let total_trees = 0;
        let total_cycles = 0;
        let largest_tree_root = null;
        let max_depth = -1;
        
        function getDepth(node, tempVisited = new Set()) {
            tempVisited.add(node);
            let maxChildDepth = 0;
            for (let child of adj.get(node)) {
                if (!tempVisited.has(child)) {
                    maxChildDepth = Math.max(maxChildDepth, getDepth(child, tempVisited));
                }
            }
            return maxChildDepth + 1;
        }
        
        function buildTree(node) {
            visited.add(node);
            const tree = {};
            for (let child of adj.get(node)) {
                tree[child] = buildTree(child);
            }
            return tree;
        }
        
        for (let root of roots) {
            let depth = getDepth(root);
            let treeStruct = {};
            treeStruct[root] = buildTree(root);
            
            hierarchies.push({
                root: root,
                tree: treeStruct,
                depth: depth
            });
            
            total_trees++;
            
            if (depth > max_depth) {
                max_depth = depth;
                largest_tree_root = root;
            } else if (depth === max_depth) {
                if (largest_tree_root === null || root < largest_tree_root) {
                    largest_tree_root = root;
                }
            }
        }
        
        const unvisited = new Set([...nodes].filter(x => !visited.has(x)));
        
        while (unvisited.size > 0) {
            let startNode = unvisited.values().next().value;
            let componentNodes = new Set();
            let queue = [startNode];
            
            const undirAdj = new Map();
            for (let n of unvisited) undirAdj.set(n, []);
            
            for (let edge of acceptedEdges) {
                if (unvisited.has(edge.u) && unvisited.has(edge.v)) {
                    undirAdj.get(edge.u).push(edge.v);
                    undirAdj.get(edge.v).push(edge.u);
                }
            }
            
            componentNodes.add(startNode);
            let qIdx = 0;
            while(qIdx < queue.length) {
                let curr = queue[qIdx++];
                for (let neighbor of undirAdj.get(curr)) {
                    if (!componentNodes.has(neighbor)) {
                        componentNodes.add(neighbor);
                        queue.push(neighbor);
                    }
                }
            }
            
            let minNode = null;
            for (let n of componentNodes) {
                if (minNode === null || n < minNode) {
                    minNode = n;
                }
                unvisited.delete(n);
                visited.add(n); 
            }
            
            hierarchies.push({
                root: minNode,
                tree: {},
                has_cycle: true
            });
            total_cycles++;
        }
        
        const responsePayload = {
            user_id: "krishnjitanshu_16092005",
            email_id: "kj1067@srmist.edu.in",
            college_roll_number: "RA2311003011454",
            hierarchies: hierarchies,
            invalid_entries: invalid_entries,
            duplicate_edges: Array.from(duplicateSet),
            summary: {
                total_trees: total_trees,
                total_cycles: total_cycles,
                largest_tree_root: largest_tree_root || ""
            }
        };
        
        res.json(responsePayload);
        
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
