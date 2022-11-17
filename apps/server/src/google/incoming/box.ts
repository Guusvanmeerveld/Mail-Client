import GoogleBox from "../interfaces/box";

import axios from "axios";

import { BoxResponse, IncomingMessage } from "@dust-mail/typings";

import { Box } from "@mail/interfaces/client/incoming.interface";

export const getBoxes = async (
	authorization: string
): Promise<BoxResponse[]> => {
	const { data } = await axios.get<{ labels: GoogleBox[] }>(
		"https://gmail.googleapis.com/gmail/v1/users/me/labels",
		{
			headers: {
				Authorization: authorization
			}
		}
	);

	return data.labels.map((box) => ({
		name: box.name,
		id: box.id,
		delimiter: "."
	}));
};

export const getBox = async (
	authorization: string,
	boxID: string
): Promise<Box> => {
	const { data } = await axios.get<{ name: string; messagesTotal: number }>(
		`https://gmail.googleapis.com/gmail/v1/users/me/labels/${boxID}`,
		{
			headers: {
				Authorization: authorization
			}
		}
	);

	return {
		name: data.name,
		messages: { total: data.messagesTotal, new: 0, unseen: 0 }
	};
};

export const getBoxMessages = async (
	authorization: string,
	boxID: string,
	options: { start: number; end: number; nextPageToken?: string }
): Promise<[messages: IncomingMessage[], nextPageToken?: string]> => {
	const { data } = await axios.get<{
		messages: { id: string }[];
		nextPageToken?: string;
	}>(`https://gmail.googleapis.com/gmail/v1/users/me/messages`, {
		params: {
			maxResults: options.end + 1 - options.start,
			labelIds: boxID,
			pageToken: options.nextPageToken,
			includeSpamTrash: "true"
		},
		headers: {
			Authorization: authorization
		}
	});

	if (!data.messages) return [[], null];

	// console.log(data.messages);

	return [
		await Promise.all(
			data.messages.map(async (message) => {
				const { data } = await axios.get<{
					internalDate: string;
					id: string;
					payload: { headers: [{ name: string; value: string }] };
				}>(
					`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
					{
						headers: {
							Authorization: authorization
						}
					}
				);

				const from = data.payload.headers
					.filter((header) => header.name === "From")
					.map((from) => ({ email: from?.value, displayName: "" }));

				console.log(data.payload.headers);

				return {
					date: new Date(parseInt(data.internalDate)),
					subject: data.payload.headers.find(
						(header) => header.name == "Subject"
					)?.value,
					from,
					id: data.id,
					box: { id: "" },
					flags: {
						seen: true
					}
				};
			})
		),
		data.nextPageToken
	];
};
