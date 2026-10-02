FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages
COPY tsconfig.json ./
RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY --from=build /app ./
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://localhost:3000/api/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["pnpm", "--filter", "@sim/web", "start"]
