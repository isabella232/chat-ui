import { authCondition } from "$lib/server/auth";
import { collections } from "$lib/server/database";
import { error } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { z } from "zod";
import type { RequestHandler } from "./$types";
import { downloadFile } from "$lib/server/files/downloadFile";

export const GET: RequestHandler = async ({ locals, params }) => {
	const sha256 = z.string().parse(params.sha256);

	const userId = locals.user?._id ?? locals.sessionId;

	// check user
	if (!userId) {
		throw error(401, "Unauthorized");
	}

	if (params.id.length !== 7) {
		const convId = new ObjectId(z.string().parse(params.id));

		// check if the user has access to the conversation
		const conv = await collections.conversations.findOne({
			_id: convId,
			...authCondition(locals),
		});

		if (!conv) {
			throw error(404, "Conversation not found");
		}
	} else {
		// look for the conversation in shared conversations
		const conv = await collections.sharedConversations.findOne({
			_id: params.id,
		});

		if (!conv) {
			throw error(404, "Conversation not found");
		}
	}

	const { value, mime } = await downloadFile(sha256, params.id);

	return new Response(Buffer.from(value, "base64"), {
		headers: {
			"Content-Type": mime ?? "application/octet-stream",
			"Content-Security-Policy":
				"default-src 'none'; script-src 'none'; style-src 'none'; sandbox;",
		},
	});
};
