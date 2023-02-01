use serde::Serialize;

use serde_json;

use crate::types::{Error, ErrorKind, Result};

pub fn parse_sdk_error(error: sdk::types::Error) -> Error {
    Error::new(ErrorKind::MailError(error), "")
}

pub fn to_json<T: Serialize + ?Sized>(data: &T) -> Result<Vec<u8>> {
    serde_json::to_vec(data).map_err(|e| {
        Error::new(
            ErrorKind::SerializeJSON,
            format!("Failed to serialize data to JSON: {}", e),
        )
    })
}
