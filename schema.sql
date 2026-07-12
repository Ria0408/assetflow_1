CREATE DATABASE IF NOT EXISTS assetflow;
USE assetflow;

CREATE TABLE IF NOT EXISTS departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  head_id INT NULL,
  parent_dept_id INT NULL,
  status ENUM('Active','Inactive') DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Admin','AssetManager','DepartmentHead','Employee','Auditor') DEFAULT 'Employee',
  department_id INT NULL,
  is_verified TINYINT(1) DEFAULT 1,
  verification_code VARCHAR(10) NULL,
  verification_expires DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  asset_tag VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  category_id INT NULL,
  serial_number VARCHAR(100) UNIQUE,
  purchase_date DATE,
  purchase_cost DECIMAL(12,2),
  location VARCHAR(150),
  `condition` ENUM('New','Excellent','Good','Fair','Damaged') DEFAULT 'Good',
  status ENUM('Available','Allocated','Reserved','Under Maintenance','Lost','Retired','Disposed') DEFAULT 'Available',
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS allocations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  asset_id INT NOT NULL,
  employee_id INT NOT NULL,
  allocated_at DATETIME,
  expected_return_date DATE,
  returned_at DATETIME NULL,
  return_condition VARCHAR(50) NULL,
  status ENUM('Active','Returned') DEFAULT 'Active',
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transfer_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  asset_id INT NOT NULL,
  from_employee_id INT NOT NULL,
  to_employee_id INT NOT NULL,
  reason TEXT,
  status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (from_employee_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_employee_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resources (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  resource_id INT NOT NULL,
  booked_by INT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  status ENUM('Confirmed','Cancelled','Completed','Rescheduled') DEFAULT 'Confirmed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
  FOREIGN KEY (booked_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  asset_id INT NOT NULL,
  raised_by INT NOT NULL,
  issue_description TEXT,
  priority ENUM('Low','Medium','High') DEFAULT 'Medium',
  technician VARCHAR(100) NULL,
  stage ENUM('Pending','Approved','Technician Assigned','In Progress','Resolved') DEFAULT 'Pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (raised_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_cycles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  department_id INT NOT NULL,
  start_date DATE,
  end_date DATE,
  status ENUM('Open','Closed') DEFAULT 'Open',
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  audit_cycle_id INT NOT NULL,
  asset_id INT NOT NULL,
  reported_location VARCHAR(150),
  verification ENUM('Verified','Missing','Damaged','Pending') DEFAULT 'Verified',
  FOREIGN KEY (audit_cycle_id) REFERENCES audit_cycles(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  message TEXT,
  category VARCHAR(50),
  is_read TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  action VARCHAR(150),
  entity_type VARCHAR(100),
  entity_id INT,
  previous_value TEXT NULL,
  updated_value TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
