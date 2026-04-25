-- ============================================
-- SQL MIGRATIONS - Supabase PostgreSQL
-- Dự án: Daily Report PWA - Cảng Tân Thuận
-- ============================================
-- Chạy từng block trong SQL Editor của Supabase
-- ============================================

-- ============================================
-- 001. EMPLOYEES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mscd VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(50) NOT NULL,
    shift VARCHAR(20) NOT NULL,
    role VARCHAR(50),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_shift ON employees(shift);
CREATE INDEX IF NOT EXISTS idx_employees_dept_shift ON employees(department, shift);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(active);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read
CREATE POLICY "employees_read" ON employees FOR SELECT USING (true);

-- Policy: Only authenticated users can write
CREATE POLICY "employees_write" ON employees FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 002. DAILY DATA TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS daily_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    day INT NOT NULL,
    
    -- XE (ô tô)
    xe_ha INT DEFAULT 0,
    xe_giao INT DEFAULT 0,
    xe_cfs INT DEFAULT 0,
    xe_total INT GENERATED ALWAYS AS (xe_ha + xe_giao + xe_cfs) STORED,
    
    -- Chi tiết XE (optional)
    xe_hb INT DEFAULT 0,    -- Hàng bách
    xe_tr INT DEFAULT 0,    -- Thùng rỗng
    xe_ln INT DEFAULT 0,    -- Lạnh nội
    xe_cr INT DEFAULT 0,    -- Chuyển rỗng
    xe_dh INT DEFAULT 0,    -- Đóng hàng
    xe_rr INT DEFAULT 0,    -- Rút rỗng
    
    -- XALAN (sà lan)
    xalan_ha INT DEFAULT 0,
    xalan_giao INT DEFAULT 0,
    xalan_cfs INT DEFAULT 0,
    xalan_total INT GENERATED ALWAYS AS (xalan_ha + xalan_giao + xalan_cfs) STORED,
    
    -- Chi tiết XALAN (optional)
    xalan_hb INT DEFAULT 0,
    xalan_tr INT DEFAULT 0,
    xalan_ln INT DEFAULT 0,
    xalan_cr INT DEFAULT 0,
    xalan_dh INT DEFAULT 0,
    xalan_rr INT DEFAULT 0,
    xalan_dh_empty INT DEFAULT 0,
    xalan_rr_empty INT DEFAULT 0,
    
    -- Totals
    total_in INT GENERATED ALWAYS AS (xe_ha + xalan_ha) STORED,
    total_out INT GENERATED ALWAYS AS (xe_giao + xalan_giao) STORED,
    total_cfs INT GENERATED ALWAYS AS (xe_cfs + xalan_cfs) STORED,
    total INT GENERATED ALWAYS AS (xe_ha + xe_giao + xe_cfs + xalan_ha + xalan_giao + xalan_cfs) STORED,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_data_year ON daily_data(year);
CREATE INDEX IF NOT EXISTS idx_daily_data_month ON daily_data(month);
CREATE INDEX IF NOT EXISTS idx_daily_data_year_month ON daily_data(year, month);
CREATE INDEX IF NOT EXISTS idx_daily_data_date ON daily_data(date);

-- Enable RLS
ALTER TABLE daily_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_data_read" ON daily_data FOR SELECT USING (true);
CREATE POLICY "daily_data_write" ON daily_data FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 003. REPORTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(30) NOT NULL, -- 'start_shift', 'end_shift', 'inventory', 'leave'
    date DATE NOT NULL,
    shift VARCHAR(20) NOT NULL,
    department VARCHAR(50) NOT NULL,
    reporter_id UUID REFERENCES employees(id),
    reporter_name VARCHAR(100),
    data JSONB NOT NULL, -- Flexible data storage for different report types
    status VARCHAR(20) DEFAULT 'submitted', -- 'draft', 'submitted', 'approved'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Một bộ phận chỉ có 1 báo cáo/loại/ngày/ca
    UNIQUE(report_type, date, shift, department)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(date);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_department ON reports(department);
CREATE INDEX IF NOT EXISTS idx_reports_shift ON reports(shift);
CREATE INDEX IF NOT EXISTS idx_reports_date_shift ON reports(date, shift);
CREATE INDEX IF NOT EXISTS idx_reports_data ON reports USING gin(data);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_read" ON reports FOR SELECT USING (true);
CREATE POLICY "reports_write" ON reports FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 004. VESSELS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS vessels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    shipping_line VARCHAR(100),
    imo_number VARCHAR(20),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_vessels_name ON vessels(name);
CREATE INDEX IF NOT EXISTS idx_vessels_shipping_line ON vessels(shipping_line);

-- Enable RLS
ALTER TABLE vessels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vessels_read" ON vessels FOR SELECT USING (true);
CREATE POLICY "vessels_write" ON vessels FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 005. VESSEL DATA TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS vessel_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Vessel info
    vessel_id UUID REFERENCES vessels(id),
    vessel_name VARCHAR(100) NOT NULL,
    voyage VARCHAR(50),
    shipping_line VARCHAR(100),
    
    -- Date
    date DATE NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    stt INT, -- Số thứ tự trong tháng
    
    -- Thời gian (timestamps)
    atb TIMESTAMPTZ, -- Arrival Time at Berth (cập cầu)
    atw TIMESTAMPTZ, -- Arrival Time Working (bắt đầu làm hàng)
    atc TIMESTAMPTZ, -- Arrival Time Complete (hoàn thành)
    atd TIMESTAMPTZ, -- Arrival Time Departure (rời cầu)
    
    -- Sản lượng (Moves)
    nhap_tau INT DEFAULT 0,  -- Dỡ hàng
    xuat_tau INT DEFAULT 0,  -- Xếp hàng
    shift_in INT DEFAULT 0,  -- Shift vào bãi
    shift_out INT DEFAULT 0, -- Shift ra bãi
    total_moves INT GENERATED ALWAYS AS (nhap_tau + xuat_tau + shift_in + shift_out) STORED,
    
    -- TEUs
    teus INT DEFAULT 0,
    
    -- Năng suất
    working_hours DECIMAL(6,2),
    berth_hours DECIMAL(6,2),
    moves_per_hour DECIMAL(6,2),
    teus_per_hour DECIMAL(6,2),
    
    -- Ghi chú
    remark TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vessel_data_date ON vessel_data(date);
CREATE INDEX IF NOT EXISTS idx_vessel_data_year_month ON vessel_data(year, month);
CREATE INDEX IF NOT EXISTS idx_vessel_data_vessel_id ON vessel_data(vessel_id);
CREATE INDEX IF NOT EXISTS idx_vessel_data_shipping_line ON vessel_data(shipping_line);

-- Enable RLS
ALTER TABLE vessel_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vessel_data_read" ON vessel_data FOR SELECT USING (true);
CREATE POLICY "vessel_data_write" ON vessel_data FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 006. MONTHLY SUMMARY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS monthly_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INT NOT NULL,
    month INT NOT NULL,
    quarter INT NOT NULL,
    
    -- XE
    xe_ha INT DEFAULT 0,
    xe_giao INT DEFAULT 0,
    xe_cfs INT DEFAULT 0,
    xe_total INT DEFAULT 0,
    
    -- XALAN
    xalan_ha INT DEFAULT 0,
    xalan_giao INT DEFAULT 0,
    xalan_cfs INT DEFAULT 0,
    xalan_total INT DEFAULT 0,
    
    -- Totals
    total_in INT DEFAULT 0,
    total_out INT DEFAULT 0,
    total_cfs INT DEFAULT 0,
    total INT DEFAULT 0,
    
    -- Comparison
    yoy_change_percent DECIMAL(6,2), -- Year-over-year change
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(year, month)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_monthly_summary_year ON monthly_summary(year);
CREATE INDEX IF NOT EXISTS idx_monthly_summary_quarter ON monthly_summary(year, quarter);

-- Enable RLS
ALTER TABLE monthly_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "monthly_summary_read" ON monthly_summary FOR SELECT USING (true);
CREATE POLICY "monthly_summary_write" ON monthly_summary FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 007. YEARLY SUMMARY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS yearly_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INT UNIQUE NOT NULL,
    
    -- XE
    xe_ha INT DEFAULT 0,
    xe_giao INT DEFAULT 0,
    xe_cfs INT DEFAULT 0,
    xe_total INT DEFAULT 0,
    
    -- XALAN
    xalan_ha INT DEFAULT 0,
    xalan_giao INT DEFAULT 0,
    xalan_cfs INT DEFAULT 0,
    xalan_total INT DEFAULT 0,
    
    -- Totals
    total_in INT DEFAULT 0,
    total_out INT DEFAULT 0,
    total_cfs INT DEFAULT 0,
    total INT DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE yearly_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "yearly_summary_read" ON yearly_summary FOR SELECT USING (true);
CREATE POLICY "yearly_summary_write" ON yearly_summary FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 008. INVENTORY SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS inventory_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capacity INT NOT NULL DEFAULT 5000, -- Công suất thiết kế
    initial_stock INT DEFAULT 0,        -- Tồn đầu kỳ
    initial_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row
INSERT INTO inventory_settings (capacity, initial_stock) 
VALUES (5000, 0) 
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE inventory_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_settings_read" ON inventory_settings FOR SELECT USING (true);
CREATE POLICY "inventory_settings_write" ON inventory_settings FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 009. HELPER FUNCTIONS
-- ============================================

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_employees_updated_at 
    BEFORE UPDATE ON employees 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_data_updated_at 
    BEFORE UPDATE ON daily_data 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at 
    BEFORE UPDATE ON reports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vessels_updated_at 
    BEFORE UPDATE ON vessels 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vessel_data_updated_at 
    BEFORE UPDATE ON vessel_data 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_summary_updated_at 
    BEFORE UPDATE ON monthly_summary 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 010. ENABLE REALTIME (Optional)
-- ============================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE reports;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_data;
ALTER PUBLICATION supabase_realtime ADD TABLE vessel_data;

-- ============================================
-- DONE! All migrations completed
-- ============================================
