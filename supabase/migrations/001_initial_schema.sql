-- Supabase PostgreSQL + PostGIS Migration for SafeRoute Delhi

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) DEFAULT 'Delhi Commuter',
    normal_pin VARCHAR(10) DEFAULT '1234',
    duress_pin VARCHAR(10) DEFAULT '9999',
    check_in_timeout INT DEFAULT 30,
    shake_sensitivity VARCHAR(20) DEFAULT 'medium',
    voice_keyword VARCHAR(50) DEFAULT 'Help SafeRoute',
    auto_share_trips BOOLEAN DEFAULT TRUE,
    language VARCHAR(10) DEFAULT 'en',
    data_retention_days INT DEFAULT 7,
    expo_push_token VARCHAR(200),
    is_volunteer BOOLEAN DEFAULT FALSE,
    volunteer_available BOOLEAN DEFAULT FALSE,
    last_location GEOGRAPHY(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Trusted Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    relationship VARCHAR(50) DEFAULT 'Friend',
    notify_sms BOOLEAN DEFAULT TRUE,
    notify_whatsapp BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Trips Table
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'PLANNING',
    origin_name VARCHAR(200),
    origin_point GEOGRAPHY(Point, 4326) NOT NULL,
    destination_name VARCHAR(200),
    destination_point GEOGRAPHY(Point, 4326) NOT NULL,
    travel_mode VARCHAR(20) DEFAULT 'walking',
    route_type VARCHAR(20) DEFAULT 'safest',
    planned_route_geometry JSONB NOT NULL,
    planned_duration_s INT DEFAULT 0,
    planned_distance_m DOUBLE PRECISION DEFAULT 0.0,
    safety_score DOUBLE PRECISION DEFAULT 85.0,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    end_time TIMESTAMP WITH TIME ZONE,
    tracking_token VARCHAR(64) UNIQUE NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_token_revoked BOOLEAN DEFAULT FALSE,
    battery_level INT DEFAULT 100,
    current_speed DOUBLE PRECISION DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Location Breadcrumbs
CREATE TABLE IF NOT EXISTS location_breadcrumbs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    speed DOUBLE PRECISION DEFAULT 0.0,
    battery INT DEFAULT 100,
    accuracy DOUBLE PRECISION DEFAULT 5.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Emergency SOS Events Table
CREATE TABLE IF NOT EXISTS sos_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trigger_type VARCHAR(40) NOT NULL,
    status VARCHAR(30) DEFAULT 'ACTIVE',
    location GEOGRAPHY(Point, 4326) NOT NULL,
    battery_level INT DEFAULT 100,
    audio_url VARCHAR(500),
    photo_url VARCHAR(500),
    tracking_token VARCHAR(64) NOT NULL,
    hardware_device_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 6. Volunteer Dispatches Table
CREATE TABLE IF NOT EXISTS sos_volunteer_dispatches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sos_event_id UUID NOT NULL REFERENCES sos_events(id) ON DELETE CASCADE,
    volunteer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'NOTIFIED',
    distance_m DOUBLE PRECISION DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    responded_at TIMESTAMP WITH TIME ZONE
);

-- 7. Incident Reports Table
CREATE TABLE IF NOT EXISTS incident_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL,
    severity INT DEFAULT 2 CHECK (severity BETWEEN 1 AND 3),
    location GEOGRAPHY(Point, 4326) NOT NULL,
    address_label VARCHAR(200),
    description TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    confirmations_count INT DEFAULT 1,
    flags_count INT DEFAULT 0,
    is_hidden BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Spatial Indexes for PostGIS queries (ST_DWithin)
CREATE INDEX IF NOT EXISTS idx_users_last_location ON users USING GIST (last_location);
CREATE INDEX IF NOT EXISTS idx_breadcrumbs_location ON location_breadcrumbs USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_sos_events_location ON sos_events USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_incident_reports_location ON incident_reports USING GIST (location);
