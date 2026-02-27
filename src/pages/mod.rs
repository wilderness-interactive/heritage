use citadel::prelude::*;

use crate::HeritagePages;

pub fn construct_tree(site: &mut Site<HeritagePages, ()>, page: &mut Page<HeritagePages>) {
    page.foundation.slug = Some("".to_owned());

    let head = site.construct_head(page);

    let html = format!(
        r##"<!DOCTYPE html>
<html lang="en">
{head}
<body>
    <div id="password-gate">
        <div class="gate-box">
            <h1>Heritage</h1>
            <p>Family access only</p>
            <input type="password" id="password-input" placeholder="Enter family password" autofocus>
            <button id="password-submit">Enter</button>
        </div>
    </div>

    <div id="app" class="hidden">
        <header>
            <h1>Heritage</h1>
            <div class="controls">
                <button id="zoom-in" title="Zoom in">+</button>
                <button id="zoom-out" title="Zoom out">&minus;</button>
                <button id="zoom-reset" title="Reset view">Reset</button>
            </div>
        </header>

        <main id="tree-container">
            <div id="tree-canvas"></div>
        </main>

        <aside id="detail-panel" class="hidden">
            <button id="detail-close">&times;</button>
            <div id="detail-content"></div>
        </aside>
    </div>

    <script>
        const TREE_DATA = [TREE_DATA];
        const FAMILY_PASSWORD = "[FAMILY_PASSWORD]";
    </script>
    <script src="zui.js"></script>
</body>
</html>"##
    );

    page.foundation.content = Some(html);
}

pub fn add_css(site: &mut Site<HeritagePages, ()>) {
    site.declare_css("foundation", r##"
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --bg: #1a1a2e;
            --bg-light: #16213e;
            --accent: #e2b04a;
            --accent-dim: #c49a3a;
            --text: #e8e8e8;
            --text-dim: #a0a0a0;
            --card-bg: #0f3460;
            --card-border: #e2b04a33;
            --gate-bg: #0d1b2a;
        }

        html, body {
            height: 100%;
            font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
            background: var(--bg);
            color: var(--text);
            overflow: hidden;
        }

        .hidden {
            display: none !important;
        }
    "##);

    site.declare_css("password_gate", r##"
        #password-gate {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            background: var(--gate-bg);

            .gate-box {
                text-align: center;
                padding: 3rem;
                border: 1px solid var(--card-border);
                border-radius: 8px;
                background: var(--bg-light);

                h1 {
                    font-size: 2.5rem;
                    color: var(--accent);
                    margin-bottom: 0.5rem;
                    font-weight: 300;
                    letter-spacing: 0.15em;
                }

                p {
                    color: var(--text-dim);
                    margin-bottom: 2rem;
                }

                input {
                    display: block;
                    width: 100%;
                    padding: 0.75rem 1rem;
                    border: 1px solid var(--card-border);
                    border-radius: 4px;
                    background: var(--bg);
                    color: var(--text);
                    font-size: 1rem;
                    margin-bottom: 1rem;
                    outline: none;

                    &:focus {
                        border-color: var(--accent);
                    }
                }

                button {
                    padding: 0.75rem 2rem;
                    background: var(--accent);
                    color: var(--bg);
                    border: none;
                    border-radius: 4px;
                    font-size: 1rem;
                    cursor: pointer;
                    font-weight: 600;

                    &:hover {
                        background: var(--accent-dim);
                    }
                }
            }
        }
    "##);

    site.declare_css("tree_app", r##"
        #app {
            display: flex;
            flex-direction: column;
            height: 100%;

            header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0.75rem 1.5rem;
                background: var(--bg-light);
                border-bottom: 1px solid var(--card-border);
                z-index: 10;

                h1 {
                    font-size: 1.25rem;
                    color: var(--accent);
                    font-weight: 300;
                    letter-spacing: 0.15em;
                }

                .controls {
                    display: flex;
                    gap: 0.5rem;

                    button {
                        padding: 0.4rem 0.75rem;
                        background: var(--bg);
                        color: var(--text);
                        border: 1px solid var(--card-border);
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 0.9rem;

                        &:hover {
                            border-color: var(--accent);
                            color: var(--accent);
                        }
                    }
                }
            }
        }
    "##);

    site.declare_css("tree_container", r##"
        #tree-container {
            flex: 1;
            overflow: hidden;
            position: relative;
            cursor: grab;

            &:active {
                cursor: grabbing;
            }
        }

        #tree-canvas {
            position: absolute;
            transform-origin: 0 0;
        }
    "##);

    site.declare_css("tree_nodes", r##"
        .person-node {
            position: absolute;
            width: 180px;
            padding: 1rem;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 6px;
            cursor: pointer;
            text-align: center;
            transition: border-color 0.2s, box-shadow 0.2s;
            user-select: none;

            &:hover {
                border-color: var(--accent);
                box-shadow: 0 0 20px rgba(226, 176, 74, 0.15);
            }

            .person-name {
                font-size: 0.95rem;
                font-weight: 600;
                color: var(--text);
                margin-bottom: 0.25rem;
            }

            .person-dates {
                font-size: 0.75rem;
                color: var(--text-dim);
            }

            .person-title {
                font-size: 0.7rem;
                color: var(--accent);
                margin-top: 0.25rem;
                font-style: italic;
            }
        }
    "##);

    site.declare_css("tree_detail_panel", r##"
        #detail-panel {
            position: fixed;
            right: 0;
            top: 0;
            bottom: 0;
            width: 360px;
            background: var(--bg-light);
            border-left: 1px solid var(--card-border);
            padding: 2rem;
            overflow-y: auto;
            z-index: 20;
            box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);

            #detail-close {
                position: absolute;
                top: 1rem;
                right: 1rem;
                background: none;
                border: none;
                color: var(--text-dim);
                font-size: 1.5rem;
                cursor: pointer;

                &:hover {
                    color: var(--text);
                }
            }

            #detail-content {
                h2 {
                    color: var(--accent);
                    font-weight: 400;
                    font-size: 1.5rem;
                    margin-bottom: 0.5rem;
                }

                .detail-title {
                    color: var(--accent-dim);
                    font-style: italic;
                    margin-bottom: 1.5rem;
                }

                .detail-section {
                    margin-bottom: 1.5rem;

                    h3 {
                        color: var(--text-dim);
                        font-size: 0.8rem;
                        text-transform: uppercase;
                        letter-spacing: 0.1em;
                        margin-bottom: 0.5rem;
                    }

                    p, li {
                        color: var(--text);
                        font-size: 0.9rem;
                        line-height: 1.6;
                    }

                    ul {
                        list-style: none;
                        padding: 0;

                        li::before {
                            content: "— ";
                            color: var(--accent);
                        }
                    }
                }

                .detail-photo {
                    width: 100%;
                    border-radius: 6px;
                    margin-bottom: 1.5rem;
                    border: 1px solid var(--card-border);
                }

                .detail-contact {
                    margin-top: 2rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid var(--card-border);

                    a {
                        display: inline-block;
                        padding: 0.5rem 1rem;
                        background: var(--bg);
                        color: var(--accent);
                        border: 1px solid var(--card-border);
                        border-radius: 4px;
                        text-decoration: none;
                        font-size: 0.85rem;

                        &:hover {
                            border-color: var(--accent);
                        }
                    }
                }
            }
        }
    "##);
}
