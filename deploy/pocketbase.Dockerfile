FROM alpine:3.22

RUN apk add --no-cache ca-certificates curl
WORKDIR /pb
COPY apps/pocketbase/pocketbase /pb/pocketbase
COPY apps/pocketbase/pb_hooks /pb/pb_hooks
COPY apps/pocketbase/pb_migrations /pb/pb_migrations
RUN chmod +x /pb/pocketbase

EXPOSE 8090
ENTRYPOINT ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--encryptionEnv=PB_ENCRYPTION_KEY", "--migrationsDir=./pb_migrations", "--hooksDir=./pb_hooks", "--hooksWatch=false"]

