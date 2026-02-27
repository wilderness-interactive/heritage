mod private;

pub use private::people::PEOPLE;
pub use private::relationships::{RELATIONSHIPS, UNIONS};
pub use private::config::PASSWORD;

use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct Person {
    pub id: &'static str,
    pub name: &'static str,
    pub born: Option<&'static str>,
    pub died: Option<&'static str>,
    pub birthplace: Option<&'static str>,
    pub title: Option<&'static str>,
    pub notes: &'static [&'static str],
    pub photo: Option<&'static str>,
}

#[derive(Debug, Serialize)]
pub struct Relationship {
    pub parent: &'static str,
    pub child: &'static str,
}

#[derive(Debug, Serialize)]
pub struct Union {
    pub partners: &'static [&'static str],
    pub date: Option<&'static str>,
    pub place: Option<&'static str>,
}
