
CREATE TABLE claims (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    employee_id VARCHAR(7) NOT NULL CHECK (employee_id ~ '^ATS0(?!000)\d{3}$'),
    employee_name VARCHAR(60) NOT NULL,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 500),
    submission_date TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    travel_date DATE,
    from_destination VARCHAR(60),
    to_destination VARCHAR(60),
    purpose TEXT,
    treatment_date DATE,
    hospital VARCHAR(30),
    treatment_type VARCHAR(30),
    claim_date DATE,
    claim_type VARCHAR(30),
    description TEXT,
    CONSTRAINT valid_type CHECK (
        (type = 'travel' AND travel_date IS NOT NULL AND from_destination IS NOT NULL AND to_destination IS NOT NULL AND purpose IS NOT NULL) OR
        (type = 'medical' AND treatment_date IS NOT NULL AND hospital IS NOT NULL AND treatment_type IS NOT NULL) OR
        (type = 'other' AND claim_date IS NOT NULL AND claim_type IS NOT NULL AND description IS NOT NULL)
    )
);


CREATE INDEX idx_employee_id ON claims(employee_id);
CREATE INDEX idx_status ON claims(status);
CREATE INDEX idx_submission_date ON claims(submission_date);
