import {
  createFormControl,
  createFormGroup,
  type IFormControl,
} from 'solid-forms'
import { TextInput } from '../components/Forms'
import Button from '../components/Button/Button'
import { UserProfile } from '../../server/users/types'

export default function ProfileEdit(props: {
  profile: UserProfile
  onSave: (profile: UserProfile) => void
}) {
  const form = createFormGroup({
    email: createFormControl<string | null>(props.profile.email),
    username: createFormControl<string | null>(props.profile.username),
  })

  function handleSubmit(e: Event) {
    e.preventDefault()
    if (!form.isValid) return

    props.onSave({
      ...props.profile,
      email: form.value.email || null,
      username: form.value.username || null,
    })
  }

  return (
    <div class="space-y-6">
      <form onSubmit={handleSubmit} class="space-y-4">
        <TextInput
          label="Email"
          control={form.controls.email as IFormControl<string>}
        />
        <TextInput
          label="Username"
          control={form.controls.username as IFormControl<string>}
        />

        <Button type="submit" primary>
          Save Profile
        </Button>
      </form>
    </div>
  )
}
