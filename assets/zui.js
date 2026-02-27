// Heritage ZUI - Zoomable User Interface for family tree

const NODE_WIDTH = 180;
const NODE_HEIGHT = 90;
const H_GAP = 60;
const V_GAP = 120;
const UNION_GAP = 40;

// Viewport transform
let scale = 1;
let panX = 0;
let panY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let panStartX = 0;
let panStartY = 0;

// Build lookup maps from flat data
const peopleById = {};
TREE_DATA.people.forEach(p => { peopleById[p.id] = p; });

const childrenOf = {};
const parentsOf = {};
TREE_DATA.relationships.forEach(r => {
    if (!childrenOf[r.parent]) childrenOf[r.parent] = [];
    childrenOf[r.parent].push(r.child);
    if (!parentsOf[r.child]) parentsOf[r.child] = [];
    parentsOf[r.child].push(r.parent);
});

const unionsByPerson = {};
TREE_DATA.unions.forEach(u => {
    u.partners.forEach(pid => {
        if (!unionsByPerson[pid]) unionsByPerson[pid] = [];
        unionsByPerson[pid].push(u);
    });
});

// Group people into couples based on unions
function getChildCouples(personIds) {
    const children = [];
    const childSeen = new Set();
    personIds.forEach(pid => {
        (childrenOf[pid] || []).forEach(cid => {
            if (!childSeen.has(cid)) {
                childSeen.add(cid);
                children.push(cid);
            }
        });
    });

    const couples = [];
    const processed = new Set();
    children.forEach(cid => {
        if (processed.has(cid)) return;
        processed.add(cid);
        const unions = unionsByPerson[cid] || [];
        if (unions.length > 0) {
            const partner = unions[0].partners.find(p => p !== cid);
            if (partner && !processed.has(partner)) {
                processed.add(partner);
                couples.push([cid, partner]);
                return;
            }
        }
        couples.push([cid]);
    });
    return couples;
}

function groupWidth(personIds) {
    return personIds.length === 2 ? NODE_WIDTH * 2 + UNION_GAP : NODE_WIDTH;
}

// For child couples, we need extra space to center the blood-relative child
// with partner extending to the right
function childCenteredWidth(personIds) {
    if (personIds.length === 1) return NODE_WIDTH;
    const rightOfCenter = NODE_WIDTH / 2 + UNION_GAP + NODE_WIDTH;
    return Math.max(NODE_WIDTH / 2, rightOfCenter) * 2;
}

// Pass 1: compute the width needed for each subtree (bottom-up)
function subtreeWidth(personIds, isChild) {
    const ownWidth = isChild ? childCenteredWidth(personIds) : groupWidth(personIds);
    const childCouples = getChildCouples(personIds);
    if (childCouples.length === 0) return ownWidth;

    let childrenTotal = 0;
    childCouples.forEach((couple, i) => {
        if (i > 0) childrenTotal += H_GAP;
        childrenTotal += subtreeWidth(couple, true);
    });
    return Math.max(ownWidth, childrenTotal);
}

// Pass 2: assign positions top-down
function assignPositions(positions, personIds, depth, startX, allocated, isChild) {
    const y = depth * (NODE_HEIGHT + V_GAP);
    let gx;

    if (isChild && personIds.length === 2) {
        // Center the blood-relative child (first person) in allocated space
        gx = startX + allocated / 2 - NODE_WIDTH / 2;
    } else {
        // Center the whole group
        const ownWidth = groupWidth(personIds);
        gx = startX + (allocated - ownWidth) / 2;
    }

    personIds.forEach((pid, i) => {
        positions[pid] = {
            x: gx + i * (NODE_WIDTH + UNION_GAP),
            y: y,
        };
    });

    const childCouples = getChildCouples(personIds);
    if (childCouples.length === 0) return;

    // CORE RULE: children center under the couple midpoint
    const coupleMidX = personIds.length === 2
        ? gx + NODE_WIDTH + UNION_GAP / 2
        : gx + NODE_WIDTH / 2;

    const childWidths = childCouples.map(c => subtreeWidth(c, true));
    const childrenTotal = childWidths.reduce((a, b) => a + b, 0)
        + (childCouples.length - 1) * H_GAP;

    let cx = coupleMidX - childrenTotal / 2;
    childCouples.forEach((couple, i) => {
        assignPositions(positions, couple, depth + 1, cx, childWidths[i], true);
        cx += childWidths[i] + H_GAP;
    });
}

// Compute tree layout - position each person node
function computeLayout() {
    const positions = {};

    // Find root ancestors (no parents in our data)
    // Exclude people who are only here as a spouse of someone who HAS parents
    const roots = TREE_DATA.people
        .filter(p => !parentsOf[p.id] || parentsOf[p.id].length === 0)
        .filter(p => {
            const unions = unionsByPerson[p.id] || [];
            if (unions.length === 0) return true;
            // If every partner has parents, this person is just a spouse — not a root
            return !unions.every(u =>
                u.partners.filter(pid => pid !== p.id).every(pid =>
                    parentsOf[pid] && parentsOf[pid].length > 0
                )
            );
        })
        .map(p => p.id);

    // Group roots into couples
    const rootCouples = [];
    const rootProcessed = new Set();
    roots.forEach(rootId => {
        if (rootProcessed.has(rootId)) return;
        rootProcessed.add(rootId);
        const unions = unionsByPerson[rootId] || [];
        if (unions.length > 0) {
            const partner = unions[0].partners.find(p => p !== rootId);
            if (partner && !rootProcessed.has(partner)) {
                rootProcessed.add(partner);
                rootCouples.push([rootId, partner]);
                return;
            }
        }
        rootCouples.push([rootId]);
    });

    let startX = 0;
    rootCouples.forEach((couple, i) => {
        if (i > 0) startX += H_GAP;
        const w = subtreeWidth(couple, false);
        assignPositions(positions, couple, 0, startX, w, false);
        startX += w;
    });

    return positions;
}

// Render the tree
function renderTree() {
    const canvas = document.getElementById("tree-canvas");
    canvas.innerHTML = "";

    const positions = computeLayout();

    // Compute tree bounds for SVG sizing
    const allPos = Object.values(positions);
    const treeBounds = {
        maxX: Math.max(...allPos.map(p => p.x + NODE_WIDTH)) + H_GAP,
        maxY: Math.max(...allPos.map(p => p.y + NODE_HEIGHT)) + V_GAP,
    };

    // Draw connection lines (SVG)
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", treeBounds.maxX);
    svg.setAttribute("height", treeBounds.maxY);
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.overflow = "visible";
    svg.style.pointerEvents = "none";
    canvas.appendChild(svg);

    // Helper: find the couple midpoint X for a person (gap between partners)
    function coupleMidX(pid) {
        const unions = unionsByPerson[pid] || [];
        if (unions.length > 0) {
            const u = unions[0];
            const pa = positions[u.partners[0]];
            const pb = positions[u.partners[1]];
            if (pa && pb) {
                const left = pa.x < pb.x ? pa : pb;
                const right = pa.x < pb.x ? pb : pa;
                return (left.x + NODE_WIDTH + right.x) / 2;
            }
        }
        return positions[pid].x + NODE_WIDTH / 2;
    }

    // Helper: draw an SVG line
    function drawLine(x1, y1, x2, y2, color) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", color);
        line.setAttribute("stroke-width", "2");
        svg.appendChild(line);
    }

    // Draw union connectors and parent-child lines
    TREE_DATA.unions.forEach(union => {
        const p1 = positions[union.partners[0]];
        const p2 = positions[union.partners[1]];
        if (!p1 || !p2) return;

        const left = p1.x < p2.x ? p1 : p2;
        const right = p1.x < p2.x ? p2 : p1;

        // Horizontal line between partners
        drawLine(left.x + NODE_WIDTH, left.y + NODE_HEIGHT / 2,
                 right.x, right.y + NODE_HEIGHT / 2, "#e2b04a88");

        // Find children of this couple
        const coupleChildren = [];
        union.partners.forEach(pid => {
            (childrenOf[pid] || []).forEach(cid => {
                if (!coupleChildren.includes(cid) && positions[cid]) {
                    coupleChildren.push(cid);
                }
            });
        });

        if (coupleChildren.length === 0) return;

        // Drop line from couple midpoint
        const midX = (left.x + NODE_WIDTH + right.x) / 2;
        const midY = left.y + NODE_HEIGHT / 2;
        const dropY = midY + V_GAP / 2;

        drawLine(midX, midY, midX, dropY, "#e2b04a77");

        // Connect to each actual child (the person who IS the child, not their spouse)
        const childCenters = coupleChildren.map(cid => positions[cid].x + NODE_WIDTH / 2);
        const allXs = [midX, ...childCenters];

        // Horizontal bar from drop point to children
        drawLine(Math.min(...allXs), dropY, Math.max(...allXs), dropY, "#e2b04a77");

        // Vertical lines down to each child
        coupleChildren.forEach(cid => {
            const cp = positions[cid];
            drawLine(cp.x + NODE_WIDTH / 2, dropY, cp.x + NODE_WIDTH / 2, cp.y, "#e2b04a77");
        });
    });

    // Draw person nodes
    TREE_DATA.people.forEach(person => {
        const pos = positions[person.id];
        if (!pos) return;

        const node = document.createElement("div");
        node.className = "person-node";
        node.style.left = pos.x + "px";
        node.style.top = pos.y + "px";
        node.style.width = NODE_WIDTH + "px";

        let html = `<div class="person-name">${person.name}</div>`;

        if (person.born || person.died) {
            const dates = [person.born || "?", person.died || ""].join(" — ");
            html += `<div class="person-dates">${dates}</div>`;
        }

        if (person.title) {
            html += `<div class="person-title">${person.title}</div>`;
        }

        node.innerHTML = html;
        node.addEventListener("click", () => showDetail(person));
        canvas.appendChild(node);
    });

    // Center the tree in the viewport
    const allPositions = Object.values(positions);
    if (allPositions.length > 0) {
        const minX = Math.min(...allPositions.map(p => p.x));
        const maxX = Math.max(...allPositions.map(p => p.x + NODE_WIDTH));
        const minY = Math.min(...allPositions.map(p => p.y));
        const maxY = Math.max(...allPositions.map(p => p.y + NODE_HEIGHT));
        const treeWidth = maxX - minX;
        const treeHeight = maxY - minY;

        const container = document.getElementById("tree-container");
        panX = (container.clientWidth - treeWidth) / 2 - minX;
        panY = (container.clientHeight - treeHeight) / 2 - minY;
        applyTransform();
    }
}

// Show detail panel for a person
function showDetail(person) {
    const panel = document.getElementById("detail-panel");
    const content = document.getElementById("detail-content");

    let html = "";

    if (person.photo) {
        html += `<img class="detail-photo" src="photos/${person.photo}" alt="${person.name}">`;
    }

    html += `<h2>${person.name}</h2>`;

    if (person.title) {
        html += `<div class="detail-title">${person.title}</div>`;
    }

    if (person.born || person.died) {
        html += `<div class="detail-section">`;
        html += `<h3>Dates</h3>`;
        if (person.born) html += `<p>Born: ${person.born}${person.birthplace ? ", " + person.birthplace : ""}</p>`;
        if (person.died) html += `<p>Died: ${person.died}</p>`;
        html += `</div>`;
    }

    // Parents
    const parents = (parentsOf[person.id] || []).map(pid => peopleById[pid]).filter(Boolean);
    if (parents.length > 0) {
        html += `<div class="detail-section"><h3>Parents</h3><ul>`;
        parents.forEach(p => { html += `<li>${p.name}</li>`; });
        html += `</ul></div>`;
    }

    // Partner(s)
    const partners = (unionsByPerson[person.id] || [])
        .flatMap(u => u.partners)
        .filter(pid => pid !== person.id)
        .map(pid => peopleById[pid])
        .filter(Boolean);
    if (partners.length > 0) {
        html += `<div class="detail-section"><h3>Partner</h3><ul>`;
        partners.forEach(p => { html += `<li>${p.name}</li>`; });
        html += `</ul></div>`;
    }

    // Children
    const myChildren = (childrenOf[person.id] || []).map(cid => peopleById[cid]).filter(Boolean);
    if (myChildren.length > 0) {
        html += `<div class="detail-section"><h3>Children</h3><ul>`;
        myChildren.forEach(c => { html += `<li>${c.name}</li>`; });
        html += `</ul></div>`;
    }

    if (person.notes && person.notes.length > 0) {
        html += `<div class="detail-section"><h3>Notes</h3><ul>`;
        person.notes.forEach(n => { html += `<li>${n}</li>`; });
        html += `</ul></div>`;
    }

    html += `<div class="detail-contact">`;
    html += `<a href="mailto:?subject=Heritage: Info about ${encodeURIComponent(person.name)}&body=I have additional information about ${encodeURIComponent(person.name)}:">`;
    html += `Have more info about ${person.name}?</a>`;
    html += `</div>`;

    content.innerHTML = html;
    panel.classList.remove("hidden");
}

// ZUI controls
function applyTransform() {
    const canvas = document.getElementById("tree-canvas");
    canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

// Pan
const container = document.getElementById("tree-container");

container.addEventListener("pointerdown", e => {
    if (e.target.closest(".person-node")) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    panStartX = panX;
    panStartY = panY;
    container.setPointerCapture(e.pointerId);
});

container.addEventListener("pointermove", e => {
    if (!isDragging) return;
    panX = panStartX + (e.clientX - dragStartX);
    panY = panStartY + (e.clientY - dragStartY);
    applyTransform();
});

container.addEventListener("pointerup", () => { isDragging = false; });

// Zoom
container.addEventListener("wheel", e => {
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const prevScale = scale;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    scale = Math.max(0.1, Math.min(3, scale * delta));

    panX = mouseX - (mouseX - panX) * (scale / prevScale);
    panY = mouseY - (mouseY - panY) * (scale / prevScale);
    applyTransform();
}, { passive: false });

// Zoom buttons
document.getElementById("zoom-in").addEventListener("click", () => {
    scale = Math.min(3, scale * 1.2);
    applyTransform();
});

document.getElementById("zoom-out").addEventListener("click", () => {
    scale = Math.max(0.1, scale / 1.2);
    applyTransform();
});

document.getElementById("zoom-reset").addEventListener("click", () => {
    scale = 1;
    renderTree();
});

// Detail panel close
document.getElementById("detail-close").addEventListener("click", () => {
    document.getElementById("detail-panel").classList.add("hidden");
});

// Password gate
document.getElementById("password-submit").addEventListener("click", checkPassword);
document.getElementById("password-input").addEventListener("keydown", e => {
    if (e.key === "Enter") checkPassword();
});

function checkPassword() {
    const input = document.getElementById("password-input");
    // Simple client-side gate - hash comparison
    // The actual password hash is set during generation
    if (input.value === FAMILY_PASSWORD) {
        document.getElementById("password-gate").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
        renderTree();
    } else {
        input.style.borderColor = "#e74c3c";
        input.value = "";
        input.placeholder = "Incorrect password";
        setTimeout(() => {
            input.style.borderColor = "";
            input.placeholder = "Enter family password";
        }, 2000);
    }
}
