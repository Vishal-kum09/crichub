# Live Schema Reference (postgres DB) — read-only introspection

39 tables.

## ai_commentary
PK: ai_commentary_id

- ai_commentary_id uuid NOT NULL DEFAULT uuid_generate_v4()
- match_id uuid NOT NULL
- innings_id uuid
- delivery_id uuid
- over_id uuid
- task character varying NOT NULL
- style character varying NOT NULL DEFAULT 'broadcast_english'::character varying
- output text NOT NULL
- source character varying NOT NULL
- status character varying NOT NULL
- is_visible boolean NOT NULL DEFAULT true
- is_manual_override boolean NOT NULL DEFAULT false
- replaced_commentary_id uuid
- version integer NOT NULL DEFAULT 1
- attempts smallint NOT NULL DEFAULT 0
- response_time_ms integer NOT NULL DEFAULT 0
- errors jsonb
- token_usage jsonb
- source_payload jsonb
- created_by uuid
- created_at timestamp with time zone NOT NULL DEFAULT now()

FKs:
- match_id -> matches(matches_id)
- innings_id -> innings(innings_id)
- delivery_id -> deliveries(deliveries_id)
- over_id -> overs(overs_id)
- replaced_commentary_id -> ai_commentary(ai_commentary_id)
- created_by -> users(user_id)

## ai_commentary_settings
PK: match_id

- match_id uuid NOT NULL
- mode character varying NOT NULL DEFAULT 'auto_with_manual_override'::character varying
- language character varying NOT NULL DEFAULT 'en'::character varying
- default_style character varying NOT NULL DEFAULT 'broadcast_english'::character varying
- live_delay_seconds smallint NOT NULL DEFAULT 3
- live_retry_attempts smallint NOT NULL DEFAULT 2
- fallback_enabled boolean NOT NULL DEFAULT true
- auto_publish boolean NOT NULL DEFAULT true
- updated_by uuid
- updated_at timestamp with time zone NOT NULL DEFAULT now()

FKs:
- match_id -> matches(matches_id)
- updated_by -> users(user_id)

## app_config
PK: app_config_key

- app_config_key character varying NOT NULL
- value text NOT NULL
- description text
- is_secret boolean NOT NULL DEFAULT false
- updated_by uuid
- updated_at timestamp with time zone NOT NULL DEFAULT now()

FKs:
- updated_by -> users(user_id)

## audit_logs
PK: audit_logs_id

- audit_logs_id uuid NOT NULL DEFAULT uuid_generate_v4()
- match_id uuid
- user_id uuid
- action character varying NOT NULL
- table_name character varying NOT NULL
- record_id uuid NOT NULL
- old_values jsonb
- new_values jsonb
- ip_address inet
- created_at timestamp with time zone NOT NULL DEFAULT now()

FKs:
- match_id -> matches(matches_id)
- user_id -> users(user_id)

## batter_over_stats
PK: batter_over_stats_id

- batter_over_stats_id uuid NOT NULL DEFAULT uuid_generate_v4()
- innings_id uuid NOT NULL
- batter_id uuid NOT NULL
- over_number smallint NOT NULL
- runs smallint NOT NULL DEFAULT 0
- balls smallint NOT NULL DEFAULT 0
- fours smallint NOT NULL DEFAULT 0
- sixes smallint NOT NULL DEFAULT 0

FKs:
- innings_id -> innings(innings_id)
- batter_id -> players(players_id)

## batting_scorecards
PK: batting_scorecards_id

- batting_scorecards_id uuid NOT NULL DEFAULT uuid_generate_v4()
- innings_id uuid NOT NULL
- player_id uuid NOT NULL
- batting_position smallint NOT NULL
- runs_scored smallint NOT NULL DEFAULT 0
- balls_faced integer NOT NULL DEFAULT 0
- fours smallint NOT NULL DEFAULT 0
- sixes smallint NOT NULL DEFAULT 0
- dot_balls_faced smallint NOT NULL DEFAULT 0
- strike_rate numeric
- minutes_batted smallint
- is_dismissed boolean NOT NULL DEFAULT false
- dismissal_id uuid
- came_in_at_over numeric
- dismissed_at_over numeric

FKs:
- innings_id -> innings(innings_id)
- player_id -> players(players_id)
- dismissal_id -> dismissals(dismissals_id)

## bowler_over_stats
PK: bowler_over_stats_id

- bowler_over_stats_id uuid NOT NULL DEFAULT uuid_generate_v4()
- innings_id uuid NOT NULL
- bowler_id uuid NOT NULL
- over_number smallint NOT NULL
- runs_conceded smallint NOT NULL DEFAULT 0
- wickets smallint NOT NULL DEFAULT 0
- fours smallint NOT NULL DEFAULT 0
- sixes smallint NOT NULL DEFAULT 0
- dot_balls smallint NOT NULL DEFAULT 0
- is_maiden boolean NOT NULL DEFAULT false
- wides smallint NOT NULL DEFAULT 0
- no_balls smallint NOT NULL DEFAULT 0

FKs:
- innings_id -> innings(innings_id)
- bowler_id -> players(players_id)

## bowling_figures
PK: bowling_figures_id

- bowling_figures_id uuid NOT NULL DEFAULT uuid_generate_v4()
- innings_id uuid NOT NULL
- player_id uuid NOT NULL
- overs_bowled numeric NOT NULL DEFAULT 0
- balls_bowled smallint NOT NULL DEFAULT 0
- runs_conceded smallint NOT NULL DEFAULT 0
- wickets smallint NOT NULL DEFAULT 0
- maidens smallint NOT NULL DEFAULT 0
- wides smallint NOT NULL DEFAULT 0
- no_balls smallint NOT NULL DEFAULT 0
- dot_balls smallint NOT NULL DEFAULT 0
- boundaries_hit smallint NOT NULL DEFAULT 0
- sixes_hit smallint NOT NULL DEFAULT 0
- economy_rate numeric
- bowling_sr numeric
- bowling_avg numeric
- top_speed numeric
- average_speed numeric
- dot_ball_percent numeric
- primary_movement USER-DEFINED

FKs:
- innings_id -> innings(innings_id)
- player_id -> players(players_id)

## bowling_spells
PK: bowling_spells_id

- bowling_spells_id uuid NOT NULL DEFAULT uuid_generate_v4()
- innings_id uuid NOT NULL
- bowler_id uuid NOT NULL
- spell_number smallint NOT NULL
- from_over smallint NOT NULL
- to_over smallint NOT NULL
- overs_count numeric NOT NULL
- runs_conceded smallint NOT NULL
- wickets smallint NOT NULL
- avg_speed_start numeric
- avg_speed_end numeric
- speed_variance numeric
- max_speed_in_spell numeric

FKs:
- innings_id -> innings(innings_id)
- bowler_id -> players(players_id)

## cache_invalidations
PK: cache_invalidations_id

- cache_invalidations_id uuid NOT NULL DEFAULT uuid_generate_v4()
- cache_key character varying NOT NULL
- trigger_event character varying NOT NULL
- invalidated_at timestamp with time zone NOT NULL DEFAULT now()

## deliveries
PK: deliveries_id

- deliveries_id uuid NOT NULL DEFAULT uuid_generate_v4()
- innings_id uuid NOT NULL
- over_id uuid NOT NULL
- over_number smallint NOT NULL
- ball_in_over smallint NOT NULL
- delivery_sequence integer NOT NULL
- bowler_id uuid NOT NULL
- batter_id uuid NOT NULL
- non_striker_id uuid NOT NULL
- delivery_type USER-DEFINED NOT NULL
- runs_batter smallint NOT NULL DEFAULT 0
- runs_extras smallint NOT NULL DEFAULT 0
- runs_total smallint NOT NULL DEFAULT 0
- ball_speed numeric
- movement_type USER-DEFINED
- spin_rate integer
- swing_degree real
- is_dot boolean NOT NULL DEFAULT false
- is_boundary_four boolean NOT NULL DEFAULT false
- is_boundary_six boolean NOT NULL DEFAULT false
- is_wicket boolean NOT NULL DEFAULT false
- pitch_x real
- pitch_y real
- pitch_z real
- pitch_length USER-DEFINED
- shot_type USER-DEFINED
- wagon_x real
- wagon_y real
- wagon_z real
- idempotency_key uuid
- scored_by uuid NOT NULL
- deleted_at timestamp with time zone
- created_at timestamp with time zone NOT NULL DEFAULT now()

FKs:
- innings_id -> innings(innings_id)
- over_id -> overs(overs_id)
- bowler_id -> players(players_id)
- batter_id -> players(players_id)
- non_striker_id -> players(players_id)
- scored_by -> users(user_id)

## dismissals
PK: dismissals_id

- dismissals_id uuid NOT NULL DEFAULT uuid_generate_v4()
- delivery_id uuid NOT NULL
- innings_id uuid NOT NULL
- dismissed_batter_id uuid NOT NULL
- bowler_id uuid
- dismissal_type USER-DEFINED NOT NULL
- is_caught_behind boolean NOT NULL DEFAULT false
- is_caught_and_bowled boolean NOT NULL DEFAULT false
- direct_hit boolean NOT NULL DEFAULT false
- end_broken USER-DEFINED
- primary_fielder_id uuid
- secondary_fielder_id uuid
- runs_at_fall smallint NOT NULL
- balls_at_fall integer NOT NULL
- over_at_fall numeric NOT NULL
- wicket_number smallint NOT NULL

FKs:
- delivery_id -> deliveries(deliveries_id)
- innings_id -> innings(innings_id)
- dismissed_batter_id -> players(players_id)
- bowler_id -> players(players_id)
- primary_fielder_id -> players(players_id)
- secondary_fielder_id -> players(players_id)

## extras
PK: id

- id uuid NOT NULL DEFAULT uuid_generate_v4()
- innings_id uuid NOT NULL
- delivery_id uuid NOT NULL
- extra_type USER-DEFINED NOT NULL
- runs smallint NOT NULL

FKs:
- innings_id -> innings(innings_id)
- delivery_id -> deliveries(deliveries_id)

## fall_of_wickets
PK: id

- id uuid NOT NULL DEFAULT uuid_generate_v4()
- innings_id uuid NOT NULL
- wicket_number smallint NOT NULL
- dismissed_batter_id uuid NOT NULL
- runs_at_fall smallint NOT NULL
- balls_at_fall integer NOT NULL
- over_at_fall numeric NOT NULL

FKs:
- innings_id -> innings(innings_id)
- dismissed_batter_id -> players(players_id)

## field_positions
PK: field_positions_id

- field_positions_id uuid NOT NULL DEFAULT uuid_generate_v4()
- field_setting_id uuid NOT NULL
- player_id uuid NOT NULL
- position_name character varying NOT NULL
- x real NOT NULL
- y real NOT NULL
- is_in_circle boolean NOT NULL DEFAULT false

FKs:
- field_setting_id -> field_settings(field_settings_id)
- player_id -> players(players_id)

## field_settings
PK: field_settings_id

- field_settings_id uuid NOT NULL DEFAULT uuid_generate_v4()
- innings_id uuid NOT NULL
- delivery_id uuid NOT NULL
- over_number smallint NOT NULL
- bowler_id uuid NOT NULL
- fielding_side USER-DEFINED NOT NULL
- notes text
- created_at timestamp with time zone NOT NULL DEFAULT now()

FKs:
- innings_id -> innings(innings_id)
- delivery_id -> deliveries(deliveries_id)
- bowler_id -> players(players_id)

## fixtures
PK: fixtures_id

- fixtures_id uuid NOT NULL DEFAULT uuid_generate_v4()
- tournament_id uuid NOT NULL
- match_id uuid
- stage USER-DEFINED NOT NULL
- fixture_number smallint NOT NULL
- team1_id uuid
- team2_id uuid
- scheduled_at timestamp with time zone
- venue character varying

FKs:
- tournament_id -> tournaments(tournaments_id)
- match_id -> matches(matches_id)
- team1_id -> teams(teams_id)
- team2_id -> teams(teams_id)

## innings
PK: innings_id

- innings_id uuid NOT NULL DEFAULT uuid_generate_v4()
- match_id uuid NOT NULL
- innings_number smallint NOT NULL
- batting_team_id uuid NOT NULL
- fielding_team_id uuid NOT NULL
- status USER-DEFINED NOT NULL DEFAULT 'in_progress'::innings_status
- total_runs smallint NOT NULL DEFAULT 0
- total_wickets smallint NOT NULL DEFAULT 0
- total_balls integer NOT NULL DEFAULT 0
- extras_wides smallint NOT NULL DEFAULT 0
- extras_no_balls smallint NOT NULL DEFAULT 0
- extras_leg_byes smallint NOT NULL DEFAULT 0
- extras_byes smallint NOT NULL DEFAULT 0
- extras_penalties smallint NOT NULL DEFAULT 0
- total_extras smallint NOT NULL DEFAULT 0
- target_runs smallint
- follow_on boolean NOT NULL DEFAULT false
- started_at timestamp with time zone
- completed_at timestamp with time zone

FKs:
- match_id -> matches(matches_id)
- batting_team_id -> teams(teams_id)
- fielding_team_id -> teams(teams_id)

## match_comments
PK: match_comments_id

- match_comments_id uuid NOT NULL DEFAULT uuid_generate_v4()
- match_id uuid NOT NULL
- author_id uuid NOT NULL
- content text NOT NULL
- is_pinned boolean NOT NULL DEFAULT false
- created_at timestamp with time zone NOT NULL DEFAULT now()
- updated_at timestamp with time zone NOT NULL DEFAULT now()

FKs:
- match_id -> matches(matches_id)
- author_id -> users(user_id)

## match_media
PK: match_media_id

- match_media_id uuid NOT NULL DEFAULT uuid_generate_v4()
- match_id uuid NOT NULL
- media_type USER-DEFINED NOT NULL
- storage_path text NOT NULL
- caption text
- uploaded_by uuid NOT NULL
- uploaded_at timestamp with time zone NOT NULL DEFAULT now()

FKs:
- match_id -> matches(matches_id)
- uploaded_by -> users(user_id)

## match_officials
PK: match_officials_id

- match_officials_id uuid NOT NULL DEFAULT uuid_generate_v4()
- match_id uuid NOT NULL
- official_name character varying NOT NULL
- role USER-DEFINED NOT NULL

FKs:
- match_id -> matches(matches_id)

## matches
PK: matches_id

- matches_id uuid NOT NULL DEFAULT uuid_generate_v4()
- external_match_id character varying
- match_date date NOT NULL
- start_time time without time zone NOT NULL
- tournament_id uuid
- format USER-DEFINED NOT NULL
- ball_type character varying NOT NULL
- overs_per_match smallint
- team1_id uuid NOT NULL
- team2_id uuid NOT NULL
- venue character varying
- pitch_num smallint
- venue_neutral boolean
- city character varying
- country character varying
- scheduled_at timestamp with time zone NOT NULL
- started_at timestamp with time zone
- completed_at timestamp with time zone
- status USER-DEFINED NOT NULL DEFAULT 'scheduled'::match_status
- toss_winner_id uuid
- toss_decision USER-DEFINED
- result_type USER-DEFINED
- result_margin smallint
- winning_team_id uuid
- result_summary text
- is_public boolean NOT NULL DEFAULT true
- notes text
- created_by uuid NOT NULL
- created_at timestamp with time zone NOT NULL DEFAULT now()
- updated_at timestamp with time zone NOT NULL DEFAULT now()

FKs:
- tournament_id -> tournaments(tournaments_id)
- team1_id -> teams(teams_id)
- team2_id -> teams(teams_id)
- toss_winner_id -> teams(teams_id)
- winning_team_id -> teams(teams_id)
- created_by -> users(user_id)

## notifications
PK: notifications_id

- notifications_id uuid NOT NULL DEFAULT uuid_generate_v4()
- user_id uuid NOT NULL
- match_id uuid
- type USER-DEFINED NOT NULL
- title character varying NOT NULL
- body text NOT NULL
- data jsonb
- is_read boolean NOT NULL DEFAULT false
- scheduled_for timestamp with time zone
- created_at timestamp with time zone NOT NULL DEFAULT now()
- read_at timestamp with time zone

FKs:
- user_id -> users(user_id)
- match_id -> matches(matches_id)

## nv_play
PK: (none)

- competition text
- match text
- date date
- start_time time without time zone
- innings integer
- over integer
- ball integer
- innings_ball integer
- batter text
- batter_id text
- bowler text
- bowler_id text
- runs integer
- extra_runs integer
- bowler_extra_runs integer
- extra text
- penalty_runs numeric
- runs_awarded_to numeric
- penalty numeric
- ball_outcome numeric
- line numeric
- length numeric
- shot numeric
- feet numeric
- secondary_feet numeric
- connection numeric
- delivery numeric
- speed numeric
- appeal_type text
- on_field_decision text
- referral_decision text
- wicket text
- dismissed_batter text
- fieldx numeric
- fieldy numeric
- arrivalx numeric
- arrivaly numeric
- events character varying
- user_events character varying
- around_the_wicket boolean
- keeper_up boolean
- fielder1 character varying
- fielder1_events character varying
- fielder1_position character varying
- fielder2 character varying
- fielder2_events character varying
- fielder2_position character varying
- fielder3 character varying
- fielder3_events character varying
- fielder3_position character varying
- fielder4 character varying
- fielder4_events character varying
- fielder4_position character varying
- batting_hand text
- bowler_type text
- timestamp timestamp without time zone
- runs_saved_or_lost integer
- toss_won_by text
- toss_decision text
- ground_end text
- non_striker text
- non_striker_id text
- team_runs integer
- team_wickets integer
- batting_position integer
- power_play numeric
- day integer
- session integer
- pitch_number character varying
- umpire text
- result text
- winning_team text
- losing_team text
- batting_team text
- bowling_team text
- venue text
- north_boundary numeric
- south_boundary numeric
- east_boundary numeric
- west_boundary numeric
- user text
- analysis_key_moment character varying
- video_key_moment character varying
- breaks text
- temperature_c numeric
- humidity numeric
- pressure_hpa numeric
- legal_ball boolean
- actual_ball integer
- free_hit boolean
- partnership_number integer
- cumulative_batter_balls integer
- cumulative_batter_runs integer
- bowling_spell integer
- bowling_over_in_spell integer
- batter_coming_in_over integer
- run_rate_at_start numeric
- run_rate_after numeric
- req_run_rate_at_start numeric
- req_run_rate_after numeric
- pitchx numeric
- pitchy numeric
- releasex numeric
- releasey numeric
- releasez numeric
- releasex_external numeric
- releasey_external numeric
- releasez_external numeric
- releasey_vision_ai numeric
- releasez_vision_ai numeric
- bouncespeed numeric
- stumpspeed numeric
- dropspeed numeric
- impactx numeric
- impacty numeric
- impactz numeric
- landingx numeric
- landingy numeric
- deviation numeric
- swingangle numeric
- dropangle numeric
- bounceangle numeric
- releaseangle numeric
- releaseaccelerationy numeric
- releaseaccelerationz numeric
- pastx numeric
- pasty numeric
- pastz numeric
- speed_radar numeric
- speed_external numeric
- analyst_pitch_length numeric
- analyst_pitch_line numeric
- external_pitchx numeric
- external_pitchy numeric
- analyst_arrival_line numeric
- analyst_arrival_height numeric
- ball_type text
- ball_colour text
- pitchside_fielder_1_x numeric
- pitchside_fielder_1_y numeric
- pitchside_fielder_2_x numeric
- pitchside_fielder_2_y numeric
- pitchside_fielder_3_x numeric
- pitchside_fielder_3_y numeric
- pitchside_fielder_4_x numeric
- pitchside_fielder_4_y numeric
- pitchside_fielder_5_x numeric
- pitchside_fielder_5_y numeric
- pitchside_fielder_6_x numeric
- pitchside_fielder_6_y numeric
- pitchside_fielder_7_x numeric
- pitchside_fielder_7_y numeric
- pitchside_fielder_8_x numeric
- pitchside_fielder_8_y numeric
- pitchside_fielder_9_x numeric
- pitchside_fielder_9_y numeric
- match_type character varying

## overs
PK: overs_id

- overs_id uuid NOT NULL DEFAULT uuid_generate_v4()
- innings_id uuid NOT NULL
- over_number smallint NOT NULL
- bowler_id uuid NOT NULL
- runs_scored smallint NOT NULL DEFAULT 0
- wickets_taken smallint NOT NULL DEFAULT 0
- legal_balls smallint NOT NULL DEFAULT 0
- dot_balls smallint NOT NULL DEFAULT 0
- boundaries_four smallint NOT NULL DEFAULT 0
- boundaries_six smallint NOT NULL DEFAULT 0
- wides smallint NOT NULL DEFAULT 0
- no_balls smallint NOT NULL DEFAULT 0
- is_maiden boolean NOT NULL DEFAULT false
- cumulative_runs smallint NOT NULL
- cumulative_wickets smallint NOT NULL
- run_rate numeric NOT NULL
- phase USER-DEFINED NOT NULL

FKs:
- innings_id -> innings(innings_id)
- bowler_id -> players(players_id)

## partnerships
PK: partnerships_id

- partnerships_id uuid NOT NULL DEFAULT uuid_generate_v4()
- innings_id uuid NOT NULL
- wicket_number smallint NOT NULL
- batter1_id uuid NOT NULL
- batter2_id uuid NOT NULL
- runs smallint NOT NULL DEFAULT 0
- balls integer NOT NULL DEFAULT 0
- batter1_runs smallint NOT NULL DEFAULT 0
- batter1_balls smallint NOT NULL DEFAULT 0
- batter2_runs smallint NOT NULL DEFAULT 0
- batter2_balls smallint NOT NULL DEFAULT 0
- started_at_runs smallint NOT NULL
- ended_at_runs smallint

FKs:
- innings_id -> innings(innings_id)
- batter1_id -> players(players_id)
- batter2_id -> players(players_id)

## pitch_map_data
PK: pitch_map_data_id

- pitch_map_data_id uuid NOT NULL DEFAULT uuid_generate_v4()
- delivery_id uuid NOT NULL
- innings_id uuid NOT NULL
- bowler_id uuid NOT NULL
- batter_id uuid NOT NULL
- x real NOT NULL
- y real NOT NULL
- z real NOT NULL
- length_label USER-DEFINED
- line_label USER-DEFINED
- recorded_at timestamp with time zone NOT NULL DEFAULT now()

FKs:
- delivery_id -> deliveries(deliveries_id)
- innings_id -> innings(innings_id)
- bowler_id -> players(players_id)
- batter_id -> players(players_id)

## player_career_stats
PK: player_career_stats_id

- player_career_stats_id uuid NOT NULL DEFAULT uuid_generate_v4()
- player_id uuid NOT NULL
- format USER-DEFINED NOT NULL
- matches_played integer NOT NULL DEFAULT 0
- innings_batted integer NOT NULL DEFAULT 0
- total_runs integer NOT NULL DEFAULT 0
- balls_faced integer NOT NULL DEFAULT 0
- highest_score smallint NOT NULL DEFAULT 0
- batting_average numeric
- batting_sr numeric
- total_fours integer NOT NULL DEFAULT 0
- total_sixes integer NOT NULL DEFAULT 0
- centuries smallint NOT NULL DEFAULT 0
- fifties smallint NOT NULL DEFAULT 0
- innings_bowled integer NOT NULL DEFAULT 0
- overs_bowled numeric NOT NULL DEFAULT 0
- runs_conceded integer NOT NULL DEFAULT 0
- wickets_taken integer NOT NULL DEFAULT 0
- bowling_average numeric
- bowling_economy numeric
- bowling_sr numeric
- three_wicket_haul smallint NOT NULL DEFAULT 0
- five_wicket_hauls smallint NOT NULL DEFAULT 0
- top_speed numeric
- average_speed numeric
- lethal_ball_type USER-DEFINED
- most_accurate_line USER-DEFINED
- updated_at timestamp with time zone NOT NULL DEFAULT now()

FKs:
- player_id -> players(players_id)

## players
PK: players_id

- players_id uuid NOT NULL DEFAULT uuid_generate_v4()
- full_name character varying NOT NULL
- display_name character varying NOT NULL
- date_of_birth date
- batting_style USER-DEFINED
- bowling_style USER-DEFINED
- primary_role USER-DEFINED NOT NULL
- jersey_number smallint
- photo_url text
- nationality character varying
- is_active boolean NOT NULL DEFAULT true
- created_at timestamp with time zone NOT NULL DEFAULT now()

## points_table
PK: point_table_id

- point_table_id uuid NOT NULL DEFAULT uuid_generate_v4()
- tournament_id uuid NOT NULL
- team_id uuid NOT NULL
- group_name character varying
- played smallint NOT NULL DEFAULT 0
- won smallint NOT NULL DEFAULT 0
- lost smallint NOT NULL DEFAULT 0
- tied smallint NOT NULL DEFAULT 0
- no_result smallint NOT NULL DEFAULT 0
- win_points smallint NOT NULL DEFAULT 0
- bonus_points smallint DEFAULT 0
- total_points smallint NOT NULL DEFAULT 0
- net_run_rate numeric NOT NULL DEFAULT 0
- updated_at timestamp with time zone NOT NULL DEFAULT now()

FKs:
- tournament_id -> tournaments(tournaments_id)
- team_id -> teams(teams_id)

## roles
PK: roles_id

- roles_id smallint NOT NULL
- name character varying NOT NULL
- description text
- can_create_match boolean NOT NULL DEFAULT false
- can_score boolean NOT NULL DEFAULT false
- can_export boolean NOT NULL DEFAULT false
- can_manage_users boolean NOT NULL DEFAULT false

## run_outs
PK: id

- id uuid NOT NULL DEFAULT uuid_generate_v4()
- dismissal_id uuid NOT NULL
- direct_hit boolean NOT NULL DEFAULT false
- end_broken USER-DEFINED NOT NULL
- primary_fielder_id uuid
- secondary_fielder_id uuid

FKs:
- dismissal_id -> dismissals(dismissals_id)
- primary_fielder_id -> players(players_id)
- secondary_fielder_id -> players(players_id)

## scorer_assignments
PK: scorer_assignments_id

- scorer_assignments_id uuid NOT NULL DEFAULT uuid_generate_v4()
- match_id uuid NOT NULL
- scorer_id uuid NOT NULL
- assigned_by uuid NOT NULL
- invite_token uuid
- token_expires_at timestamp with time zone
- accepted_at timestamp with time zone
- revoked_at timestamp with time zone
- created_at timestamp with time zone NOT NULL DEFAULT now()

FKs:
- match_id -> matches(matches_id)
- scorer_id -> users(user_id)
- assigned_by -> users(user_id)

## team_players
PK: team_players_id

- team_players_id uuid NOT NULL DEFAULT uuid_generate_v4()
- team_id uuid NOT NULL
- player_id uuid NOT NULL
- jersey_number smallint
- squad_role USER-DEFINED NOT NULL
- joined_at date
- left_at date

FKs:
- team_id -> teams(teams_id)
- player_id -> players(players_id)

## teams
PK: teams_id

- teams_id uuid NOT NULL DEFAULT uuid_generate_v4()
- name character varying NOT NULL
- short_name character varying NOT NULL
- logo_url text
- home_ground character varying
- country character varying
- created_by uuid NOT NULL
- is_active boolean NOT NULL DEFAULT true
- created_at timestamp with time zone NOT NULL DEFAULT now()

FKs:
- created_by -> users(user_id)

## tournament_teams
PK: tournament_teams_id

- tournament_teams_id uuid NOT NULL DEFAULT uuid_generate_v4()
- tournament_id uuid NOT NULL
- team_id uuid NOT NULL
- group_name character varying
- seed smallint
- registered_at timestamp with time zone NOT NULL DEFAULT now()

FKs:
- tournament_id -> tournaments(tournaments_id)
- team_id -> teams(teams_id)

## tournaments
PK: tournaments_id

- tournaments_id uuid NOT NULL DEFAULT uuid_generate_v4()
- name character varying NOT NULL
- format USER-DEFINED NOT NULL
- match_format USER-DEFINED NOT NULL
- no_of_overs_match smallint
- start_date date NOT NULL
- end_date date
- host_team character varying
- logo_url text
- status USER-DEFINED NOT NULL DEFAULT 'upcoming'::tournament_status
- created_by uuid NOT NULL
- created_at timestamp with time zone NOT NULL DEFAULT now()

FKs:
- created_by -> users(user_id)

## user_sessions
PK: user_sessions_id

- user_sessions_id uuid NOT NULL DEFAULT uuid_generate_v4()
- user_id uuid NOT NULL
- ip_address inet
- user_agent text
- logged_in_at timestamp with time zone NOT NULL DEFAULT now()
- logged_out_at timestamp with time zone

FKs:
- user_id -> users(user_id)

## users
PK: user_id

- user_id uuid NOT NULL DEFAULT uuid_generate_v4()
- email character varying NOT NULL
- first_name character varying NOT NULL
- last_name character varying NOT NULL
- display_name character varying NOT NULL
- role USER-DEFINED NOT NULL DEFAULT 'viewer'::platform_role
- avatar_url text
- is_active boolean NOT NULL DEFAULT true
- last_login_at timestamp with time zone
- created_at timestamp with time zone NOT NULL DEFAULT now()
- updated_at timestamp with time zone NOT NULL DEFAULT now()

