-- 1) 기존 중복 데이터 정리 (같은 이름+문구+엔딩키 조합은 최신 1건만 유지)
with ranked as (
  select
    id,
    row_number() over (
      partition by player_name, message_text, coalesce(ending_key, '')
      order by created_at desc, id desc
    ) as row_num
  from public.credit_messages
)
delete from public.credit_messages cm
using ranked r
where cm.id = r.id
  and r.row_num > 1;

-- 2) 재중복 방지 유니크 인덱스
create unique index if not exists credit_messages_dedupe_unique_idx
on public.credit_messages (player_name, message_text, coalesce(ending_key, ''));
