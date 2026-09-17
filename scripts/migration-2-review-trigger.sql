create or replace function recompute_lawyer_rating() returns trigger as $$
begin
  update lawyers set
    review_count = (select count(*) from reviews where lawyer_id = new.lawyer_id),
    rating = (select round(avg(rating)::numeric, 1) from reviews where lawyer_id = new.lawyer_id)
  where id = new.lawyer_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists reviews_recompute_rating on reviews;
create trigger reviews_recompute_rating after insert on reviews
  for each row execute function recompute_lawyer_rating();
