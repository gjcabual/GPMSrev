-- GPMS Database Initialization for PostgreSQL
-- Run: psql -U postgres -d gpmsdb -f init_gpmsdb.sql
-- Or connect first: \c gpmsdb then \i init_gpmsdb.sql

-- Enable pgcrypto for UUID generation (if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUM TYPES
-- ============================================
CREATE TYPE sex_type AS ENUM ('MALE', 'FEMALE', 'PREFER NOT TO SAY');

-- ============================================
-- TABLES (in dependency order)
-- ============================================

-- 1. Users
CREATE TABLE users_tbl (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    role INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_users_email ON users_tbl(email);

-- 2. Batch sticker sessions (no FK)
CREATE TABLE batch_sticker_sessions_tbl (
    batch_id SERIAL PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    start_at INTEGER NOT NULL,
    end_at INTEGER NOT NULL,
    price INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL
);

-- 3. Profiles
CREATE TABLE profiles_tbl (
    profile_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    image BYTEA,
    birth_date DATE NOT NULL,
    sex sex_type,
    contact_no VARCHAR(20),
    address VARCHAR(255),
    user_id UUID NOT NULL UNIQUE REFERENCES users_tbl(user_id) ON DELETE CASCADE,
    CONSTRAINT check_contact_length CHECK (length(contact_no) >= 8),
    CONSTRAINT check_birth_date CHECK (birth_date < CURRENT_DATE)
);

-- 4. Vehicles
CREATE TABLE vehicles_tbl (
    plate_no VARCHAR(100) PRIMARY KEY,
    brand VARCHAR(255) NOT NULL,
    model VARCHAR(255) NOT NULL,
    vehicle_type VARCHAR(255) NOT NULL,
    front_image BYTEA,
    back_image BYTEA,
    color VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES users_tbl(user_id)
);

-- 5. Slips
CREATE TABLE slips_tbl (
    slip_id SERIAL PRIMARY KEY,
    total_amount INTEGER NOT NULL,
    nature_of_payment VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    image BYTEA,
    official_receipt VARCHAR(255),
    user_id UUID NOT NULL REFERENCES users_tbl(user_id)
);

-- 6. Stickers
CREATE TABLE stickers_tbl (
    id SERIAL PRIMARY KEY,
    sticker_id VARCHAR(255) NOT NULL,
    batch_id INTEGER NOT NULL REFERENCES batch_sticker_sessions_tbl(batch_id),
    plate_no VARCHAR(100) NOT NULL REFERENCES vehicles_tbl(plate_no)
);

-- 7. Applications
CREATE TABLE applications_tbl (
    application_id SERIAL PRIMARY KEY,
    role VARCHAR(255) NOT NULL,
    building_name VARCHAR(255) NOT NULL,
    app_type VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    expired_at DATE NOT NULL,
    user_id UUID NOT NULL REFERENCES users_tbl(user_id),
    plate_no VARCHAR(255) NOT NULL REFERENCES vehicles_tbl(plate_no),
    sticker_id INTEGER UNIQUE REFERENCES stickers_tbl(id),
    slip_id INTEGER REFERENCES slips_tbl(slip_id)
);

-- 8. Application status
CREATE TABLE application_status_tbl (
    status_id SERIAL PRIMARY KEY,
    status VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    application_id INTEGER NOT NULL REFERENCES applications_tbl(application_id),
    processed_by UUID REFERENCES users_tbl(user_id)
);

-- 9. Documents
CREATE TABLE documents_tbl (
    document_id SERIAL PRIMARY KEY,
    type VARCHAR(255) NOT NULL,
    image BYTEA,
    registered_date DATE NOT NULL,
    expired_at DATE NOT NULL,
    plate_no VARCHAR(255) REFERENCES vehicles_tbl(plate_no),
    user_id UUID NOT NULL REFERENCES users_tbl(user_id),
    application_id INTEGER REFERENCES applications_tbl(application_id)
);

-- 10. Auth driver
CREATE TABLE auth_driver_tbl (
    auth_driver_id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    birth_date DATE NOT NULL,
    relationship_status VARCHAR(255) NOT NULL,
    profile_image BYTEA,
    user_id UUID NOT NULL REFERENCES users_tbl(user_id),
    document_id INTEGER NOT NULL REFERENCES documents_tbl(document_id)
);

-- 11. Assigned drivers
CREATE TABLE assigned_drivers_tbl (
    assign_driver_id SERIAL PRIMARY KEY,
    assigned_at DATE NOT NULL,
    auth_driver_id INTEGER NOT NULL REFERENCES auth_driver_tbl(auth_driver_id),
    application_id INTEGER NOT NULL REFERENCES applications_tbl(application_id)
);

-- 12. Tokens
CREATE TABLE tokens_tbl (
    token_id SERIAL PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    refresh_token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    expired_at TIMESTAMP NOT NULL,
    token_type VARCHAR(50) NOT NULL DEFAULT 'access',
    user_id UUID NOT NULL REFERENCES users_tbl(user_id)
);

-- ============================================
-- SEED DATA
-- ============================================

-- Batch sticker sessions
INSERT INTO batch_sticker_sessions_tbl (type, start_at, end_at, price, created_at) VALUES
('Student', 1001, 1999, 50, NOW()),
('Employee Parking', 1001, 1999, 50, NOW()),
('Drop Off', 1001, 1999, 50, NOW()),
('Graduate/Undergrad Student', 1001, 1999, 50, NOW()),
('Concessionaire', 1001, 1999, 100, NOW());

-- Users (role: 0=admin, 1=staff, 2=applicant)
-- Passwords: admin123, staff123, applicant123
INSERT INTO users_tbl (user_id, email, password, verified_at, created_at, updated_at, role) VALUES
('a0000000-0000-0000-0000-000000000001'::uuid, 'admin@example.com', '$2b$12$VU8QPRXfAYhe9PmwashvjO.OnsGCGkoEZKlLvfDo4nHt/hqOq81kC', NOW(), NOW(), NOW(), 0),
('a0000000-0000-0000-0000-000000000002'::uuid, 'staff@example.com', '$2b$12$4.ZzPb1kE76FyDaXxWjtsO1IyzDofOn9hMawXfzdBiYwx8XJO2BtK', NOW(), NOW(), NOW(), 1),
('a0000000-0000-0000-0000-000000000003'::uuid, 'staff1@example.com', '$2b$12$4.ZzPb1kE76FyDaXxWjtsO1IyzDofOn9hMawXfzdBiYwx8XJO2BtK', NOW(), NOW(), NOW(), 1),
('a0000000-0000-0000-0000-000000000004'::uuid, 'staff2@example.com', '$2b$12$4.ZzPb1kE76FyDaXxWjtsO1IyzDofOn9hMawXfzdBiYwx8XJO2BtK', NOW(), NOW(), NOW(), 1),
('a0000000-0000-0000-0000-000000000005'::uuid, 'applicant@example.com', '$2b$12$VhaYH7vwrYUXLHio9wXxmexwxRQvObsM87mSY0RhwBGKoknT4M36u', NOW(), NOW(), NOW(), 2),
('a0000000-0000-0000-0000-000000000006'::uuid, 'applicant1@example.com', '$2b$12$VhaYH7vwrYUXLHio9wXxmexwxRQvObsM87mSY0RhwBGKoknT4M36u', NOW(), NOW(), NOW(), 2),
('a0000000-0000-0000-0000-000000000007'::uuid, 'applicant2@example.com', '$2b$12$VhaYH7vwrYUXLHio9wXxmexwxRQvObsM87mSY0RhwBGKoknT4M36u', NOW(), NOW(), NOW(), 2);

-- Profiles
INSERT INTO profiles_tbl (first_name, last_name, birth_date, sex, contact_no, address, user_id) VALUES
('Admin', 'User', '1990-01-15', 'MALE', '09123456789', '123 Admin St, City', 'a0000000-0000-0000-0000-000000000001'::uuid),
('Staff', 'Member', '1992-05-20', 'FEMALE', '09187654321', '456 Staff Ave, City', 'a0000000-0000-0000-0000-000000000002'::uuid),
('Sarah', 'Johnson', '1988-03-12', 'FEMALE', '09187654001', '101 Pine Street, City', 'a0000000-0000-0000-0000-000000000003'::uuid),
('Michael', 'Chen', '1991-06-25', 'PREFER NOT TO SAY', '09187654002', '202 Oak Avenue, City', 'a0000000-0000-0000-0000-000000000004'::uuid),
('John', 'Applicant', '1995-07-10', 'MALE', '09198765432', '789 User Blvd, City', 'a0000000-0000-0000-0000-000000000005'::uuid),
('Alice', 'Smith', '1997-03-15', 'FEMALE', '09198765433', '101 Student Ave, City', 'a0000000-0000-0000-0000-000000000006'::uuid),
('Bob', 'Johnson', '1996-05-20', 'MALE', '09198765434', '202 College St, City', 'a0000000-0000-0000-0000-000000000007'::uuid);

-- Vehicles (applicants only)
INSERT INTO vehicles_tbl (plate_no, brand, model, vehicle_type, color, user_id) VALUES
('ABC123', 'Toyota', 'Vios', 'Car', 'White', 'a0000000-0000-0000-0000-000000000005'::uuid),
('XYZ789', 'Honda', 'Civic', 'Car', 'Black', 'a0000000-0000-0000-0000-000000000005'::uuid),
('DEF456', 'Isuzu', 'D-Max', 'Truck', 'Silver', 'a0000000-0000-0000-0000-000000000006'::uuid),
('GHI789', 'Yamaha', 'NMAX', 'Motorcycle', 'Red', 'a0000000-0000-0000-0000-000000000007'::uuid);

-- Applications (one per vehicle)
INSERT INTO applications_tbl (role, building_name, app_type, date, expired_at, user_id, plate_no) VALUES
('Student', 'Main Building', 'New', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'a0000000-0000-0000-0000-000000000005'::uuid, 'ABC123'),
('Student', 'Main Building', 'New', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'a0000000-0000-0000-0000-000000000005'::uuid, 'XYZ789'),
('Student', 'Main Building', 'New', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'a0000000-0000-0000-0000-000000000006'::uuid, 'DEF456'),
('Student', 'Main Building', 'New', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'a0000000-0000-0000-0000-000000000007'::uuid, 'GHI789');

-- Application status (Pending for each)
INSERT INTO application_status_tbl (status, date, application_id, processed_by)
SELECT 'Pending', CURRENT_DATE, application_id, NULL
FROM applications_tbl;
