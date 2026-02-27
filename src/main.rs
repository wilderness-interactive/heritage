mod data;
mod pages;

use citadel::prelude::*;
use pages::*;

use data::{PEOPLE, RELATIONSHIPS, UNIONS, PASSWORD};

#[derive(Hash, Eq, PartialEq, Clone)]
pub enum HeritagePages {
    Tree,
}

fn main() {
    let tree_data = serde_json::json!({
        "people": PEOPLE,
        "relationships": RELATIONSHIPS,
        "unions": UNIONS,
    });
    let tree_json = serde_json::to_string_pretty(&tree_data)
        .expect("Failed to serialize tree data");

    let pages = vec![
        Page {
            foundation: PageFoundation {
                title: "Heritage".to_owned(),
                metadescription: Some("Family ancestry tree".to_owned()),
                ..default()
            },
            specification: HeritagePages::Tree,
        },
    ];

    let mut site = Site {
        title: "Heritage".to_owned(),
        base_url: Url::parse("https://heritage.example.com/").expect("Invalid base URL"),
        ..default()
    };

    site.declare_decree("[TREE_DATA]", &tree_json);
    site.declare_decree("[FAMILY_PASSWORD]", PASSWORD);

    add_css(&mut site);

    site = site
        .add_constructor(HeritagePages::Tree, construct_tree)
        .add_head_constructor()
        .add_pages(pages);

    site.commence();
}
