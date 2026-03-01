# API Documentation — S-Rank Agent

Base URL: `https://api.s-rank-agent.com` (prod) / `http://localhost:4000` (dev)

All protected routes require `Authorization: Bearer <clerk_jwt>`.

## Endpoints

### Health
`GET /health` → `{ status, version, timestamp }`

### Chat
| Method | Path | Description |
|--------|------|-------------|
| GET | /chat/conversations | List conversations |
| POST | /chat/conversations | Create conversation |
| GET | /chat/conversations/:id/messages | Get messages |
| POST | /chat/stream | Send message + stream response (SSE) |

### Files
| Method | Path | Description |
|--------|------|-------------|
| GET | /files/list?path= | List directory contents |
| GET | /files/read?path= | Read file content |
| POST | /files/write | Write file `{ path, content }` |
| DELETE | /files/delete?path= | Delete file |
| POST | /files/move | Move/rename `{ from, to }` |
| POST | /files/upload | Upload file (multipart) |
| GET | /files/search?q= | Search files |

### Connectors
| Method | Path | Description |
|--------|------|-------------|
| GET | /connectors | List all (with user status) |
| POST | /connectors/connect | Connect `{ type, credentials }` |
| POST | /connectors/disconnect | Disconnect `{ connectorId }` |
| POST | /connectors/test | Test credentials `{ connectorId }` |

### Skills
| Method | Path | Description |
|--------|------|-------------|
| GET | /skills/marketplace | Browse skills |
| GET | /skills/installed | User's installed skills |
| POST | /skills/install | Install `{ skillId }` |
| POST | /skills/uninstall | Uninstall `{ skillId }` |

### Servers
| Method | Path | Description |
|--------|------|-------------|
| GET | /servers/status | Get user's server status |
| POST | /servers/provision | Create server `{ size }` |
| POST | /servers/start | Start server |
| POST | /servers/stop | Stop server |
| GET | /servers/metrics | CPU, RAM, disk usage |

### Monitoring
| Method | Path | Description |
|--------|------|-------------|
| GET | /monitoring/logs | Activity logs |
| GET | /monitoring/usage?period= | Token/cost usage |
| GET | /monitoring/dashboard | Summary dashboard |

### Settings
| Method | Path | Description |
|--------|------|-------------|
| GET | /settings/profile | Get user profile |
| POST | /settings/api-key | Set Claude API key |
| POST | /settings/trust-level | Update trust level |
| POST | /settings/agent-mode | Set on-demand/always-on |

### Billing
| Method | Path | Description |
|--------|------|-------------|
| POST | /billing/checkout | Create Stripe checkout |
| POST | /billing/portal | Open customer portal |
| POST | /billing/webhook | Stripe webhook |
