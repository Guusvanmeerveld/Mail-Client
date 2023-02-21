use std::{
    io,
    net::{SocketAddr, TcpStream, ToSocketAddrs},
    time::Duration,
};

use crate::{
    constants::{ERR, LF, OK, SPACE},
    types::{self, Capabilities, Capability, Error, ErrorKind, Result, Stats, UniqueID},
};

/// A simple struct to parse responses from the server
pub struct Parser {
    /// The response message that needs to be parsed
    response: String,
}

impl Parser {
    pub fn new<S: Into<String>>(response: S) -> Self {
        Self {
            response: response.into(),
        }
    }

    /// Parse the message count and drop size from a given string
    fn parse_counts_from_string(string: &str) -> Stats {
        let mut split = string.split(SPACE);

        let message_count: u32 = split.next().unwrap().trim().parse().unwrap();

        let drop_size: u64 = split.next().unwrap().trim().parse().unwrap();

        (message_count, drop_size)
    }

    pub fn to_stats(&self) -> Stats {
        Self::parse_counts_from_string(&self.response)
    }

    pub fn to_stats_list(&self) -> Vec<Stats> {
        let end_of_line = char::from_u32(LF as u32).unwrap();

        let split = self.response.split(end_of_line).filter(|s| s.len() != 0);

        split.map(Self::parse_counts_from_string).collect()
    }

    fn parse_unique_id_from_string(string: &str) -> UniqueID {
        let mut split = string.split(SPACE);

        let msg_id: u32 = split.next().unwrap().trim().parse().unwrap();

        let unique_id = split.next().unwrap().trim().to_owned();

        (msg_id, unique_id)
    }

    pub fn to_unique_id(&self) -> UniqueID {
        Self::parse_unique_id_from_string(&self.response)
    }

    pub fn to_unique_id_list(&self) -> Vec<UniqueID> {
        let end_of_line = char::from_u32(LF as u32).unwrap();

        let split = self.response.split(end_of_line).filter(|s| s.len() != 0);

        split
            .map(|line| Self::parse_unique_id_from_string(line))
            .collect()
    }
}

pub fn parse_utf8_bytes(bytes: Vec<u8>) -> Result<String> {
    String::from_utf8(bytes).map_err(|err| {
        Error::new(
            ErrorKind::InvalidResponse,
            format!(
                "Failed to parse server response into utf8 encoded string: {}",
                err
            ),
        )
    })
}

pub fn parse_server_response<'a>(full_response: &'a str) -> Result<&'a str> {
    let ok_size = OK.len().saturating_add(1);

    if full_response.len() < ok_size {
        return Err(types::Error::new(
            types::ErrorKind::InvalidResponse,
            "Response is too short",
        ));
    };

    if full_response.starts_with(OK) {
        // We add one so we also remove the space

        let response = match full_response.get(ok_size..) {
            Some(response) => response,
            _ => unreachable!(),
        };

        Ok(response.trim())
    } else if full_response.starts_with(ERR) {
        let left_over = full_response.get((ERR.len() + 1)..).unwrap();

        Err(types::Error::new(
            types::ErrorKind::ServerError,
            format!("Server error: {}", left_over.trim()),
        ))
    } else {
        Err(types::Error::new(
            types::ErrorKind::InvalidResponse,
            format!("Response is invalid: '{}'", full_response),
        ))
    }
}

pub fn parse_socket_address<A: ToSocketAddrs>(addr: A) -> types::Result<SocketAddr> {
    Ok(addr
        .to_socket_addrs()
        .map_err(|e| {
            types::Error::new(
                types::ErrorKind::ParseServerAddress,
                format!("Failed to parse given address: {}", e),
            )
        })?
        .next()
        .unwrap())
}

pub fn parse_capabilities(response: &str) -> Capabilities {
    let end_of_line = char::from_u32(LF as u32).unwrap();

    let split = response.split(end_of_line);

    split
        .filter_map(|line| {
            let line = line.trim().to_ascii_uppercase();

            let mut split = line.split(SPACE);

            match split.next() {
                Some(capability) => {
                    let capability_enum = match capability {
                        "TOP" => Some(Capability::Top),
                        "USER" => Some(Capability::User),
                        "SASL" => {
                            let arguments: Vec<String> = split.map(|s| s.to_owned()).collect();

                            Some(Capability::Sasl(arguments))
                        }
                        "RESP-CODES" => Some(Capability::RespCodes),
                        "LOGIN-DELAY" => {
                            let delay: Duration = match split.next() {
                                Some(delay) => Duration::from_secs(delay.parse::<u64>().unwrap()),
                                None => Duration::from_secs(0),
                            };

                            Some(Capability::LoginDelay(delay))
                        }
                        "PIPELINING" => Some(Capability::Pipelining),
                        "EXPIRE" => {
                            let expires: Option<Duration> = match split.next() {
                                Some(expires) => {
                                    Some(Duration::from_secs(expires.parse::<u64>().unwrap()))
                                }
                                None => None,
                            };

                            Some(Capability::Expire(expires))
                        }
                        "UIDL" => Some(Capability::Uidl),
                        "IMPLEMENTATION" => {
                            let arguments: String = split.map(|s| s.to_owned()).collect();

                            Some(Capability::Implementation(arguments))
                        }
                        _ => {
                            // println!("{:?}", capability);

                            None
                        }
                    };

                    capability_enum
                }
                None => None,
            }
        })
        .collect::<Capabilities>()
}

pub fn map_native_tls_error(error: native_tls::HandshakeError<TcpStream>) -> types::Error {
    types::Error::new(types::ErrorKind::SecureConnection, error.to_string())
}

pub fn map_write_error_to_error(write_error: io::Error) -> types::Error {
    types::Error::new(
        types::ErrorKind::SendCommand,
        format!("Failed to send command: {}", write_error.to_string()),
    )
}

#[cfg(test)]
mod test {
    use std::time::Duration;

    use crate::types::Capability;

    use super::parse_capabilities;

    #[test]
    fn test_parse_capabilities() {
        let to_parse = "USER\r\nuidl\r\nLOGIN-DELAY 30\r\n";

        let to_match: Vec<Capability> = vec![
            Capability::User,
            Capability::Uidl,
            Capability::LoginDelay(Duration::from_secs(30)),
        ];

        let parsed_capabilities = parse_capabilities(to_parse);

        assert_eq!(parsed_capabilities, to_match);
    }
}
