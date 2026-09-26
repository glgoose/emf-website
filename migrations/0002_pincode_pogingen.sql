-- Progressieve blokkering na foute pincode-pogingen, per gehasht IP
CREATE TABLE pincode_pogingen (
  ip_hash        TEXT    PRIMARY KEY,
  fouten         INTEGER NOT NULL,
  geblokkeerd_tot TEXT
);
