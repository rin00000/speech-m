# Local-only Supabase SQL

이 폴더는 로컬 Docker Supabase에만 적용하는 SQL을 둔다.

## 원칙

- `supabase/migrations/`는 원격 Supabase에도 배포될 수 있는 schema migration만 둔다.
- 로컬 reset, mock 데이터 보정, Docker 전용 baseline처럼 원격에 반영하면 안 되는 SQL은 이 폴더에 둔다.
- 이 폴더의 SQL은 `supabase db push` 대상이 아니다.
- 원격에도 필요한 schema 변경은 반드시 `supabase/migrations/<timestamp>_<name>.sql`에 새 migration으로 만든다.

## 적용

로컬 Supabase DB 컨테이너가 켜진 상태에서 실행한다.

```powershell
npm run db:local:sql -- .\supabase\local\<file-name>.sql
```

이 명령은 `supabase_db_speech-m` Docker 컨테이너의 로컬 Postgres에만 SQL을 적용한다.

## 주의

- 원격 DB에 필요한 변경을 이 폴더에 두면 배포 환경에는 반영되지 않는다.
- 이 폴더의 SQL을 Supabase Dashboard SQL Editor나 `supabase db push`로 원격에 적용하지 않는다.
- 기존에 migration history 정합성 때문에 남겨둔 migration은 예외일 수 있지만, 새 local-only SQL은 이 폴더를 사용한다.
