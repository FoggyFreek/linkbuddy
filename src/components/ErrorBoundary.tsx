import { Component, type ReactNode } from 'react'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import CenteredStatus from './CenteredStatus.js'

type Props = Readonly<{ children: ReactNode; resetKey?: unknown }>
type State = { failed: boolean }

// Contains a render error to its own subtree. A change of `resetKey` (or
// "Try again") renders the children afresh.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.failed && prevProps.resetKey !== this.props.resetKey) this.reset()
  }

  reset = () => {
    this.setState({ failed: false })
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <CenteredStatus role="alert" variant={null}>
        <Typography>Something went wrong showing this part of the page.</Typography>
        <Button onClick={this.reset} sx={{ mt: 1 }}>Try again</Button>
      </CenteredStatus>
    )
  }
}
