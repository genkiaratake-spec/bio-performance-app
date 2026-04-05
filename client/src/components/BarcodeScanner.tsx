import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const [error, setError] = useState<string | null>(null)
  const detectedRef = useRef(false)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader

    if (!videoRef.current) return

    reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
      if (result && !detectedRef.current) {
        detectedRef.current = true
        reader.reset()
        onDetected(result.getText())
      }
      if (err && !(err instanceof NotFoundException)) {
        // only surface real errors, not "no barcode found in frame"
        console.error('ZXing error:', err)
      }
    }).catch((e) => {
      console.error('Camera error:', e)
      setError('カメラへのアクセスを許可してください')
    })

    return () => {
      reader.reset()
    }
  }, [onDetected])

  const handleClose = () => {
    readerRef.current?.reset()
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#000', display: 'flex', flexDirection: 'column',
    }}>
      {/* Close button */}
      <button
        onClick={handleClose}
        style={{
          position: 'absolute', top: 52, right: 20, zIndex: 10,
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff', fontSize: 20, display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer',
        }}
      >
        ×
      </button>

      {error ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16,
        }}>
          <span style={{ fontSize: 48 }}>📷</span>
          <p style={{ color: '#fff', fontSize: 14, textAlign: 'center', lineHeight: 1.6 }}>
            {error}
          </p>
          <button
            onClick={handleClose}
            style={{
              background: '#4ade80', color: '#000', border: 'none',
              borderRadius: 10, padding: '10px 24px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            戻る
          </button>
        </div>
      ) : (
        <>
          {/* Video */}
          <video
            ref={videoRef}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
            }}
          />

          {/* Overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {/* Scan guide box */}
            <div style={{
              width: 260, height: 160,
              position: 'relative',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              borderRadius: 12,
            }}>
              {/* Corner brackets */}
              {[
                { top: 0, left: 0, borderTop: '3px solid #4ade80', borderLeft: '3px solid #4ade80' },
                { top: 0, right: 0, borderTop: '3px solid #4ade80', borderRight: '3px solid #4ade80' },
                { bottom: 0, left: 0, borderBottom: '3px solid #4ade80', borderLeft: '3px solid #4ade80' },
                { bottom: 0, right: 0, borderBottom: '3px solid #4ade80', borderRight: '3px solid #4ade80' },
              ].map((style, i) => (
                <div key={i} style={{
                  position: 'absolute', width: 20, height: 20,
                  borderRadius: 2, ...style,
                }} />
              ))}

              {/* Scan line animation */}
              <div style={{
                position: 'absolute', left: 8, right: 8, height: 2,
                background: 'linear-gradient(90deg, transparent, #4ade80, transparent)',
                animation: 'scanline 1.8s ease-in-out infinite',
                top: '50%',
              }} />
            </div>
          </div>

          {/* Bottom label */}
          <div style={{
            position: 'absolute', bottom: 110, left: 0, right: 0,
            textAlign: 'center',
          }}>
            <p style={{
              color: '#fff', fontSize: 13, fontWeight: 600,
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            }}>
              バーコードをカメラに向けてください
            </p>
          </div>
        </>
      )}

      <style>{`
        @keyframes scanline {
          0%, 100% { transform: translateY(-40px); opacity: 0.3; }
          50% { transform: translateY(40px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
