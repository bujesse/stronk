import { X } from 'lucide-react'

interface NoteModalProps {
  title: string
  value: string
  placeholder: string
  onChange: (value: string) => void
  onClose: () => void
  onSave: () => Promise<void>
}

export function NoteModal({
  title,
  value,
  placeholder,
  onChange,
  onClose,
  onSave,
}: NoteModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-modal-title"
      >
        <div className="section-header">
          <div>
            <strong id="note-modal-title">{title}</strong>
          </div>
          <button
            className="ghost-button compact-icon-button"
            onClick={onClose}
            aria-label="Close note editor"
            title="Close"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>
        <textarea
          value={value}
          placeholder={placeholder}
          rows={5}
          onChange={(event) => onChange(event.target.value)}
        />
        <div className="section-actions">
          <button className="ghost-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" onClick={() => void onSave()}>
            Save note
          </button>
        </div>
      </div>
    </div>
  )
}

