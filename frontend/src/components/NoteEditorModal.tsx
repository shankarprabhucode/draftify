import { useNotesUI } from '../hooks/useNotesUI'
import { useCreateNote, useUpdateNote } from '../hooks/useNotes'
import { Modal } from './Modal'
import { NoteForm } from './NoteForm'

/** Renders the create/edit modal based on the editor state in context. */
export function NoteEditorModal() {
  const { editor, closeEditor } = useNotesUI()
  const create = useCreateNote()
  const update = useUpdateNote()

  if (editor.mode === 'closed') return null

  const isEdit = editor.mode === 'edit'
  const mutation = isEdit ? update : create

  return (
    <Modal title={isEdit ? 'Edit note' : 'New note'} onClose={closeEditor}>
      <NoteForm
        key={isEdit ? editor.note.id : 'new'}
        initial={isEdit ? { title: editor.note.title, content: editor.note.content } : undefined}
        submitLabel={isEdit ? 'Save changes' : 'Add note'}
        pending={mutation.isPending}
        error={mutation.error?.message ?? null}
        onCancel={closeEditor}
        onSubmit={(input) => {
          // Optimistic update means we can close immediately; the hook rolls
          // back and the dashboard surfaces the error if the server rejects it.
          if (isEdit) update.mutate({ id: editor.note.id, input })
          else create.mutate(input)
          closeEditor()
        }}
      />
    </Modal>
  )
}
