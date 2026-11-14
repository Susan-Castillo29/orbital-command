import type { IncomingMessage, ServerResponse } from 'node:http';
export function nasaHandler(req: IncomingMessage, res: ServerResponse, next?: () => void): Promise<void>;
