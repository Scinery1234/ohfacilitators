# Test Suite Documentation

This directory contains the comprehensive test suite for the Your Place frontend application.

## Test Structure

```
src/test/
├── components/          # UI component tests
│   ├── Button.test.jsx
│   ├── Card.test.jsx
│   ├── Input.test.jsx
│   ├── Alert.test.jsx
│   ├── Spinner.test.jsx
│   └── EmptyState.test.jsx
├── pages/               # Page component tests
│   ├── HostEvent.test.jsx
│   ├── MyEvents.test.jsx
│   └── HostDashboard.test.jsx
├── api/                 # API function tests
│   ├── events.test.js
│   ├── places.test.js
│   └── bookings.test.js
├── integration/         # Integration tests
│   └── eventFlow.test.jsx
├── utils/               # Test utilities
│   └── testHelpers.jsx
└── setup.js             # Test setup and mocks
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run tests once (CI mode)
```bash
npm run test:run
```

### Run tests with coverage
```bash
npm test -- --coverage
```

### Run specific test file
```bash
npm test -- Button.test.jsx
```

### Run tests matching pattern
```bash
npm test -- --grep "Button"
```

## Test Coverage Goals

- **Components**: 80%+ coverage
- **Pages**: 70%+ coverage
- **API Functions**: 90%+ coverage
- **Critical User Flows**: 100% coverage

## Writing Tests

### Component Tests

Test component rendering, props, interactions, and accessibility:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Button from '@/components/ui/Button';

describe('Button Component', () => {
  it('should render button with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });
});
```

### Page Tests

Test page rendering, data fetching, user interactions, and error states:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MyEvents from '@/pages/MyEvents';
import * as eventsAPI from '@/api/events';

vi.mock('@/api/events');

describe('MyEvents Page', () => {
  it('should display events list', async () => {
    eventsAPI.getMyEvents = vi.fn().mockResolvedValue({
      events: [{ id: '1', title: 'Test Event' }]
    });
    
    render(<MyEvents />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeInTheDocument();
    });
  });
});
```

### API Tests

Test API functions with mocked HTTP client:

```jsx
import { describe, it, expect, vi } from 'vitest';
import * as eventsAPI from '@/api/events';
import apiClient from '@/api/client';

vi.mock('@/api/client');

describe('Events API', () => {
  it('should fetch user events', async () => {
    apiClient.get = vi.fn().mockResolvedValue({
      data: { events: [{ id: '1' }] }
    });
    
    const result = await eventsAPI.getMyEvents();
    expect(result.events).toHaveLength(1);
  });
});
```

### Integration Tests

Test complete user flows across multiple components:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Event Creation Flow', () => {
  it('should complete full event creation flow', async () => {
    // Test complete flow from form to list
  });
});
```

## Test Utilities

Use helper functions from `testHelpers.jsx`:

```jsx
import { renderWithProviders, mockUser, mockEvent } from '@/test/utils/testHelpers';

it('should render with providers', () => {
  renderWithProviders(<MyComponent />, {
    route: '/my-events',
    initialAuthState: mockUser,
  });
});
```

## Best Practices

1. **Test Behavior, Not Implementation**
   - Test what users see and do, not internal state
   - Focus on user interactions and outcomes

2. **Use Descriptive Test Names**
   - `it('should display error message when form is invalid')`
   - Not: `it('test form')`

3. **Arrange-Act-Assert Pattern**
   ```jsx
   it('should submit form', async () => {
     // Arrange
     const user = userEvent.setup();
     render(<Form />);
     
     // Act
     await user.type(screen.getByLabelText('Email'), 'test@example.com');
     await user.click(screen.getByRole('button', { name: /submit/i }));
     
     // Assert
     expect(screen.getByText('Success')).toBeInTheDocument();
   });
   ```

4. **Mock External Dependencies**
   - Mock API calls
   - Mock router navigation
   - Mock localStorage

5. **Test Accessibility**
   - Use `getByRole`, `getByLabelText` instead of `getByTestId`
   - Test keyboard navigation
   - Test ARIA attributes

6. **Clean Up**
   - Use `afterEach` cleanup
   - Reset mocks between tests
   - Clear localStorage

## Common Patterns

### Testing Async Operations

```jsx
it('should load data', async () => {
  api.getData = vi.fn().mockResolvedValue({ data: [] });
  
  render(<Component />);
  
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});
```

### Testing Form Submissions

```jsx
it('should submit form', async () => {
  const user = userEvent.setup();
  const handleSubmit = vi.fn();
  
  render(<Form onSubmit={handleSubmit} />);
  
  await user.type(screen.getByLabelText('Name'), 'Test');
  await user.click(screen.getByRole('button', { name: /submit/i }));
  
  expect(handleSubmit).toHaveBeenCalledWith({ name: 'Test' });
});
```

### Testing Error States

```jsx
it('should display error message', async () => {
  api.getData = vi.fn().mockRejectedValue(new Error('Failed'));
  
  render(<Component />);
  
  await waitFor(() => {
    expect(screen.getByText(/failed/i)).toBeInTheDocument();
  });
});
```

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Before deployment

## Troubleshooting

### Tests failing with "Cannot find module"
- Check that mocks are properly set up
- Verify import paths use `@/` alias

### Async tests timing out
- Increase timeout: `it('test', async () => { ... }, { timeout: 10000 })`
- Use `waitFor` for async operations

### localStorage not working
- Use the mock from `setup.js`
- Clear localStorage in `beforeEach`

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library User Event](https://testing-library.com/docs/user-event/intro)
