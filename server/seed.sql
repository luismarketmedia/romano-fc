-- Reset data
DELETE FROM match_events;
DELETE FROM matches;
DELETE FROM players;
DELETE FROM lineups;
DELETE FROM teams;

-- Teams (5)
INSERT INTO teams (name, color, line_count, formation, reserves_count) VALUES
  ('Gremio', '#0d47a1', 5, '1-2-1-1', 2),
  ('Inter', '#b71c1c', 5, '1-2-1-1', 2),
  ('Romano', '#ff6d00', 5, '1-2-1-1', 2),
  ('Santos', '#212121', 5, '1-2-1-1', 2),
  ('Palmeiras', '#1b5e20', 5, '1-2-1-1', 2);

-- Players (30 = 5 per position among 6 positions)
-- GOL (5)
INSERT INTO players (name, position, paid) VALUES
  ('G1', 'GOL', 1), ('G2', 'GOL', 1), ('G3', 'GOL', 1), ('G4', 'GOL', 0), ('G5', 'GOL', 1);
-- DEF (5)
INSERT INTO players (name, position, paid) VALUES
  ('D1', 'DEF', 1), ('D2', 'DEF', 1), ('D3', 'DEF', 0), ('D4', 'DEF', 1), ('D5', 'DEF', 1);
-- ALAD (5)
INSERT INTO players (name, position, paid) VALUES
  ('AD1', 'ALAD', 1), ('AD2', 'ALAD', 1), ('AD3', 'ALAD', 0), ('AD4', 'ALAD', 1), ('AD5', 'ALAD', 1);
-- ALAE (5)
INSERT INTO players (name, position, paid) VALUES
  ('AE1', 'ALAE', 1), ('AE2', 'ALAE', 1), ('AE3', 'ALAE', 0), ('AE4', 'ALAE', 1), ('AE5', 'ALAE', 1);
-- MEI (5)
INSERT INTO players (name, position, paid) VALUES
  ('M1', 'MEI', 1), ('M2', 'MEI', 1), ('M3', 'MEI', 0), ('M4', 'MEI', 1), ('M5', 'MEI', 1);
-- ATA (5)
INSERT INTO players (name, position, paid) VALUES
  ('A1', 'ATA', 1), ('A2', 'ATA', 1), ('A3', 'ATA', 0), ('A4', 'ATA', 1), ('A5', 'ATA', 1);
