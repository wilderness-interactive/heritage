// Example data - copy this to people.rs and fill in your own family tree
use super::Person;

pub static PEOPLE: &[Person] = &[
    Person {
        id: "ancestor",
        name: "Your Ancestor",
        born: Some("c. 1800"),
        died: Some("c. 1870"),
        birthplace: Some("Somewhere"),
        title: None,
        notes: &["The earliest known ancestor in your records"],
        photo: None,
    },
];
