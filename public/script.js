document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('dataForm');
    const input = document.getElementById('dataInput');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('span');
    const btnLoader = document.getElementById('btnLoader');
    const errorMsg = document.getElementById('errorMessage');
    const resultsSection = document.getElementById('resultsSection');

    const statTotalTrees = document.getElementById('statTotalTrees');
    const statTotalCycles = document.getElementById('statTotalCycles');
    const statLargestRoot = document.getElementById('statLargestRoot');

    const resUserId = document.getElementById('resUserId');
    const resEmail = document.getElementById('resEmail');
    const resRoll = document.getElementById('resRoll');
    const invalidCount = document.getElementById('invalidCount');
    const invalidList = document.getElementById('invalidList');
    const duplicateCount = document.getElementById('duplicateCount');
    const duplicateList = document.getElementById('duplicateList');
    const hierarchiesContainer = document.getElementById('hierarchiesContainer');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        errorMsg.style.display = 'none';
        resultsSection.style.display = 'none';
        
        let parsedData;
        try {
            parsedData = JSON.parse(input.value);
            if (!Array.isArray(parsedData)) {
                throw new Error("Input must be a JSON array of strings.");
            }
        } catch (err) {
            showError("Invalid JSON: " + err.message);
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/bfhl', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data: parsedData })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Server responded with status ${response.status}`);
            }

            renderResults(data);

        } catch (err) {
            showError("API Error: " + err.message);
        } finally {
            setLoading(false);
        }
    });

    function setLoading(isLoading) {
        submitBtn.disabled = isLoading;
        if (isLoading) {
            btnText.style.display = 'none';
            btnLoader.style.display = 'block';
        } else {
            btnText.style.display = 'block';
            btnLoader.style.display = 'none';
        }
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
    }

    function renderResults(data) {
        statTotalTrees.textContent = data.summary.total_trees;
        statTotalCycles.textContent = data.summary.total_cycles;
        statLargestRoot.textContent = data.summary.largest_tree_root || '-';

        resUserId.textContent = data.user_id;
        resEmail.textContent = data.email_id;
        resRoll.textContent = data.college_roll_number;

        invalidCount.textContent = data.invalid_entries.length;
        invalidList.innerHTML = data.invalid_entries.length ? 
            data.invalid_entries.map(e => `<li>${escapeHtml(e)}</li>`).join('') :
            '<li><span style="color: #64748b;">None</span></li>';

        duplicateCount.textContent = data.duplicate_edges.length;
        duplicateList.innerHTML = data.duplicate_edges.length ? 
            data.duplicate_edges.map(e => `<li>${escapeHtml(e)}</li>`).join('') :
            '<li><span style="color: #64748b;">None</span></li>';

        hierarchiesContainer.innerHTML = '';
        if (data.hierarchies.length === 0) {
            hierarchiesContainer.innerHTML = '<p style="color: #64748b;">No hierarchies found.</p>';
        } else {
            data.hierarchies.forEach((h, index) => {
                const block = document.createElement('div');
                block.className = 'hierarchy-block';
                
                let tags = '';
                if (h.has_cycle) {
                    tags += `<span class="node-tag tag-cycle">Cycle Detected</span>`;
                } else if (h.depth !== undefined) {
                    tags += `<span class="node-tag tag-depth">Depth: ${h.depth}</span>`;
                }

                let treeHtml = '';
                if (Object.keys(h.tree).length > 0) {
                    treeHtml = buildTreeHtml(h.tree);
                } else {
                    treeHtml = `
                        <div class="tree-node-wrapper">
                            <div class="node-label">${h.root} <span class="node-tag tag-root">Root</span></div>
                        </div>
                    `;
                }

                block.innerHTML = `
                    <div style="margin-bottom: 1rem; display: flex; align-items: center; gap: 1rem;">
                        <h3 style="margin: 0; font-size: 1.1rem; color: #e2e8f0;">Group ${index + 1}</h3>
                        ${tags}
                    </div>
                    ${treeHtml}
                `;
                hierarchiesContainer.appendChild(block);
            });
        }

        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function buildTreeHtml(nodeObj, isRoot = true) {
        let html = '';
        for (const [key, children] of Object.entries(nodeObj)) {
            const hasChildren = Object.keys(children).length > 0;
            const rootTag = isRoot ? '<span class="node-tag tag-root">Root</span>' : '';
            
            html += `
                <div class="tree-node-wrapper">
                    <div class="node-label">${key} ${rootTag}</div>
                    ${hasChildren ? `<div>${buildTreeHtml(children, false)}</div>` : ''}
                </div>
            `;
        }
        return html;
    }

    function escapeHtml(unsafe) {
        return (unsafe || '').toString()
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }
});
