import React, { useState } from 'react';

/**
 * CV6 kit Chat — Data Block element. Renders an interactive spreadsheet with a
 * working Table to Chart toggle, never numbers buried in prose.
 *
 * Props:
 *   columns[]     = [ { key, label, numericAlign? } ] — column definitions.
 *   rows[]        = [ { ...data } ] — row data objects keyed by column.key.
 *   title         = string (optional, shown in data header)
 *   subtitle      = string (optional, shown as tname subtitle)
 *   chart         = { type?, data? } (optional, for chart view — currently bar chart)
 *   onRecoCut     = func (optional, called when user taps "Re-cut by agent")
 *   onExportCSV   = func (optional, called when user taps "Export CSV")
 *   onAddToDoc    = func (optional, called when user taps "Add to a doc")
 *
 * Sample defaults render a 4-day build log (Mon-Thu).
 */

export function DataBlock({
  columns = [
    { key: 'day', label: 'Day' },
    { key: 'built', label: 'Built', numericAlign: true },
    { key: 'verified', label: 'Verified', numericAlign: true },
    { key: 'open', label: 'Open', numericAlign: true },
  ],
  rows = [
    { day: 'Mon', built: '12', verified: '10', open: '2' },
    { day: 'Tue', built: '18', verified: '16', open: '2' },
    { day: 'Wed', built: '21', verified: '19', open: '1' },
    { day: 'Thu', built: '24', verified: '23', open: '1' },
    { day: 'Total', built: '75', verified: '68', open: '6', isFooter: true },
  ],
  title = 'Build log',
  subtitle = 'build log, last 4 days',
  chart = {
    type: 'bar',
    data: [
      { label: 'Mon', value: 42 },
      { label: 'Tue', value: 67 },
      { label: 'Wed', value: 80 },
      { label: 'Thu', value: 96 },
    ],
    chartLabel: 'Verified per day',
  },
  onRecoCut = () => {},
  onExportCSV = () => {},
  onAddToDoc = () => {},
}) {
  const [activeView, setActiveView] = useState('table');
  const gcol = `repeat(${columns.length}, 1fr)`;

  return (
    <div className="cdata">
      <div className="cdata-h">
        <span className="dt">{title}</span>
        <div className="toggle">
          <button
            className={activeView === 'table' ? 'on' : ''}
            data-v="table"
            onClick={() => setActiveView('table')}
          >
            Table
          </button>
          <button
            className={activeView === 'chart' ? 'on' : ''}
            data-v="chart"
            onClick={() => setActiveView('chart')}
          >
            Chart
          </button>
        </div>
      </div>

      {activeView === 'table' && (
        <div className="tbl" style={{ gridTemplateColumns: gcol }}>
          {/* header row */}
          <div className="tr th" style={{ gridTemplateColumns: gcol }}>
            {columns.map((col) => (
              <div key={col.key} className={col.numericAlign ? 'num' : ''}>
                {col.label}
              </div>
            ))}
          </div>
          {/* data rows */}
          {rows.map((row, idx) => (
            <div
              key={idx}
              className={`tr ${row.isFooter ? 'tf' : ''}`}
              style={{ gridTemplateColumns: gcol }}
            >
              {columns.map((col) => (
                <div
                  key={col.key}
                  className={`${col.numericAlign ? 'num' : ''} ${
                    row.isFooter && col.numericAlign ? 'pos' : ''
                  }`}
                >
                  {row[col.key] || ''}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {activeView === 'chart' && chart && chart.type === 'bar' && (
        <div>
          <div className="bars">
            {chart.data && chart.data.map((item) => (
              <div key={item.label} className="bar">
                <i style={{ height: `${item.value}%` }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          {chart.chartLabel && (
            <div
              style={{
                textAlign: 'center',
                fontSize: '11px',
                color: 'var(--faint)',
                marginTop: '8px',
              }}
            >
              {chart.chartLabel}
            </div>
          )}
        </div>
      )}

      <div className="chips">
        <button className="chip-btn" onClick={onRecoCut}>
          Re-cut by agent
        </button>
        <button className="chip-btn" onClick={onExportCSV}>
          Export CSV
        </button>
        <button className="chip-btn" onClick={onAddToDoc}>
          Add to a doc
        </button>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--faint)', paddingLeft: '2px' }}>
        A spreadsheet is re-cuttable: the human can ask the agent to group, filter,
        or chart it differently.
      </div>
    </div>
  );
}
