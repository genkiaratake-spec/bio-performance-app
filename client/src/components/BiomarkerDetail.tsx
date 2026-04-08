import { motion } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';
import type { BiomarkerEntry } from '../types/healthCheck';
import { getBiomarkerRange, getBarPosition, BIOMARKER_DESCRIPTIONS } from '../lib/biomarkerEvaluation';

interface BiomarkerDetailProps {
  entry: BiomarkerEntry;
  previousValue?: number | null;
  onClose: () => void;
}

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  optimal: { bg: '#0d2e24', color: '#1DB97D', label: '\u2713 Optimal' },
  sufficient: { bg: '#1a1f2e', color: '#5a8ccc', label: '\u25CF Sufficient' },
  out_of_range: { bg: '#2a1f0e', color: '#d4913a', label: '! Out of Range' },
  unavailable: { bg: '#1e1e26', color: '#555560', label: '\u2014 \u672A\u6E2C\u5B9A' },
};

export default function BiomarkerDetail({ entry, previousValue, onClose }: BiomarkerDetailProps) {
  const [, navigate] = useLocation();
  const range = getBiomarkerRange(entry.key);
  const statusCfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.unavailable;

  const delta = (previousValue != null && entry.value != null)
    ? Math.round((entry.value - previousValue) * 100) / 100
    : null;

  // Build 5-segment widths from range data
  function buildSegments() {
    if (!range) return null;
    const total = range.max - range.min;
    if (total <= 0) return null;

    const lowOut = (range.sufficientLow ?? range.optimalLow) - range.min;
    const suffLow = range.optimalLow - (range.sufficientLow ?? range.optimalLow);
    const optimal = range.optimalHigh - range.optimalLow;
    const suffHigh = (range.sufficientHigh ?? range.optimalHigh) - range.optimalHigh;
    const highOut = range.max - (range.sufficientHigh ?? range.optimalHigh);

    return [
      { width: (lowOut / total) * 100, color: '#3a3018', label: range.min },
      { width: (suffLow / total) * 100, color: '#1e3a2e', label: range.sufficientLow ?? range.optimalLow },
      { width: (optimal / total) * 100, color: '#1DB97D', label: range.optimalLow },
      { width: (suffHigh / total) * 100, color: '#1e3a2e', label: range.optimalHigh },
      { width: (highOut / total) * 100, color: '#3a3018', label: range.sufficientHigh ?? range.optimalHigh },
    ];
  }

  const segments = buildSegments();
  const needlePos = entry.value != null ? getBarPosition(entry.key, entry.value) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#111118',
          borderRadius: '16px 16px 0 0',
          padding: '24px 20px 32px',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={20} color="#888" />
        </button>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
            {entry.label}
          </div>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              background: statusCfg.bg,
              color: statusCfg.color,
            }}
          >
            {statusCfg.label}
          </span>
        </div>

        {/* Value display */}
        {entry.value != null ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 24 }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: '#fff' }}>
              {entry.value}
            </span>
            <span style={{ fontSize: 14, color: '#888' }}>
              {entry.unit}
            </span>
          </div>
        ) : (
          <div style={{ fontSize: 18, color: '#555', marginBottom: 24 }}>
            --
          </div>
        )}

        {/* Range bar */}
        {segments && needlePos != null ? (
          <div style={{ marginBottom: 24 }}>
            {/* Needle */}
            <div style={{ position: 'relative', height: 14, marginBottom: 2 }}>
              <div
                style={{
                  position: 'absolute',
                  left: `${needlePos}%`,
                  transform: 'translateX(-50%)',
                  fontSize: 12,
                  color: '#fff',
                  lineHeight: 1,
                }}
              >
                {'\u25BC'}
              </div>
            </div>

            {/* Bar */}
            <div
              style={{
                display: 'flex',
                height: 8,
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              {segments.map((seg, i) => (
                <div
                  key={i}
                  style={{
                    width: `${seg.width}%`,
                    background: seg.color,
                    minWidth: seg.width > 0 ? 2 : 0,
                  }}
                />
              ))}
            </div>

            {/* Labels */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 4,
                fontSize: 10,
                color: '#666',
              }}
            >
              <span>{range!.min}</span>
              {range!.sufficientLow != null && range!.sufficientLow !== range!.optimalLow && (
                <span>{range!.sufficientLow}</span>
              )}
              <span style={{ color: '#1DB97D' }}>{range!.optimalLow}</span>
              <span style={{ color: '#1DB97D' }}>{range!.optimalHigh}</span>
              {range!.sufficientHigh != null && range!.sufficientHigh !== range!.optimalHigh && (
                <span>{range!.sufficientHigh}</span>
              )}
              <span>{range!.max}</span>
            </div>
          </div>
        ) : (
          /* Simple fallback bar when no range data */
          entry.value != null && (
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  height: 8,
                  borderRadius: 4,
                  background: '#1e1e26',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '50%',
                    height: '100%',
                    background: '#555',
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>
          )
        )}

        {/* Previous value */}
        {previousValue != null && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              background: '#0e0e15',
              borderRadius: 10,
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            <span style={{ color: '#888' }}>
              {'\u524D\u56DE\uFF1A'}{previousValue} {entry.unit}
            </span>
            {delta != null && delta !== 0 && (
              <span
                style={{
                  fontWeight: 600,
                  color: delta > 0 ? '#e05555' : '#1DB97D',
                }}
              >
                {delta > 0 ? `\u25B2 +${delta}` : `\u25BC ${delta}`}
              </span>
            )}
          </div>
        )}

        {/* Description */}
        <div
          style={{
            padding: '14px 16px',
            background: '#0e0e15',
            borderRadius: 10,
            marginBottom: 20,
            fontSize: 14,
            lineHeight: 1.7,
            color: '#aaa',
          }}
        >
          {BIOMARKER_DESCRIPTIONS[entry.key] ?? '\u3053\u306E\u30D0\u30A4\u30AA\u30DE\u30FC\u30AB\u30FC\u306E\u8A73\u7D30\u8AAC\u660E\u306F\u6E96\u5099\u4E2D\u3067\u3059\u3002'}
        </div>

        {/* Action link */}
        <button
          onClick={() => navigate('/supplements')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '14px 0',
            background: 'rgba(29, 185, 125, 0.12)',
            border: '1px solid rgba(29, 185, 125, 0.25)',
            borderRadius: 12,
            color: '#1DB97D',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {'\u30B5\u30D7\u30EA\u63A8\u5968\u3092\u78BA\u8A8D'}
          <ArrowRight size={16} />
        </button>
      </motion.div>
    </motion.div>
  );
}
