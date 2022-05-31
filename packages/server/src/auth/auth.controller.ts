import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Post,
	Req,
	UnauthorizedException,
	UseGuards
} from "@nestjs/common";

import { ImapSimple } from "imap-simple";

import { AuthService } from "./auth.service";

import { JwtAuthGuard } from "./jwt-auth.guard";

import { allowedDomains } from "./constants";

import { MailValidationPipe } from "./pipes/mail.pipe";

import { ThrottlerBehindProxyGuard } from "./throttler-proxy.guard";

import Error from "./enums/error.enum";

@Controller("auth")
export class AuthController {
	private allowedDomains?: string[];

	constructor(private authService: AuthService) {
		if (allowedDomains) this.allowedDomains = allowedDomains.split(",");
	}

	@Post("login")
	@UseGuards(ThrottlerBehindProxyGuard)
	async login(
		@Body("server")
		server?: string,
		@Body("port")
		port?: number,
		@Body("username", MailValidationPipe)
		username?: string,
		@Body("password")
		password?: string
	) {
		if (username && password) {
			if (
				server &&
				this.allowedDomains &&
				!this.allowedDomains.includes(server)
			) {
				throw new UnauthorizedException("Mail server is not on whitelist");
			}

			const token = await this.authService
				.login(username, password, server, port)
				.then((token) => token)
				.catch((error: Error) => {
					throw new BadRequestException(error);
				});

			return token;
		}

		throw new BadRequestException("Missing fields");
	}

	@Get("logout")
	@UseGuards(JwtAuthGuard)
	logout(@Req() req: Request & { user: { connection: ImapSimple } }) {
		const connection = req.user.connection;

		if (!connection)
			throw new UnauthorizedException("Token expired or was never created");

		connection.end();

		return "ok";
	}
}
