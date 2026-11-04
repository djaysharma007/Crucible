import { Server } from '@hocuspocus/server';
import dotenv from 'dotenv';

dotenv.config();

const port = Number(process.env.COLLAB_PORT) || 4001;

export const collabServer = Server.configure({
  port,
  async onConnect(data) {
    // Phase 1 will implement room session token verification and permission rejection
    return data;
  },
});

if (process.env.NODE_ENV !== 'test') {
  collabServer.listen().then(() => {
    // Structured log
    process.stdout.write(`Crucible Collab Server running on ws://localhost:${port}\n`);
  });
}
