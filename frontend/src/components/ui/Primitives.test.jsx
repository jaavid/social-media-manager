import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from './Input';
import Textarea from './Textarea';
import Select from './Select';
import Modal from './Modal';
import Sheet from './Sheet';
import Tabs, { TabPanel } from './Tabs';
import DataTable from './DataTable';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './DropdownMenu';

jest.mock('../../i18n', () => ({ useLanguage: () => ({ tr: v => v, isPersian: true, formatNumber: String }) }));

it('connects field labels and combines consumer descriptions with errors', () => {
  render(<><p id="external">External help</p><Input label="Email" hint="Hint" error="Invalid email" aria-describedby="external" /><Textarea label="Notes" error="Required" /></>);
  const email = screen.getByLabelText('Email');
  expect(email).toHaveAttribute('aria-invalid', 'true');
  expect(email).toHaveAccessibleDescription('External help Invalid email');
  expect(screen.getByLabelText('Notes')).toHaveAccessibleDescription('Required');
});

it('toggles passwords with a named keyboard accessible control', async () => {
  render(<Input label="Password" type="password" />);
  await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
  expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
  expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');
});

it('select skips disabled options and closes on Tab and Escape', async () => {
  const change = jest.fn();
  render(<Select label="Workspace" value="a" onChange={change} options={[{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Blocked', disabled: true }, { value: 'c', label: 'Charlie' }]} />);
  const trigger = screen.getByRole('combobox'); trigger.focus();
  await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
  expect(change).toHaveBeenCalledWith('c');
  expect(trigger).toHaveFocus();
  await userEvent.click(trigger); await userEvent.keyboard('{Escape}');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(trigger); await userEvent.keyboard('{Tab}');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

it('searchable select exposes the active descendant and filters options', async () => {
  render(<Select label="Platform" searchable options={[{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }]} />);
  await userEvent.click(screen.getByRole('combobox', { name: 'Platform' }));
  const search = screen.getByRole('combobox', { name: 'Search…' });
  await userEvent.type(search, 'Beta'); await userEvent.keyboard('{ArrowDown}');
  expect(screen.queryByRole('option', { name: 'Alpha' })).not.toBeInTheDocument();
  expect(search).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Beta' }).id);
});

it.each([Modal, Sheet])('dialog traps focus, has unique labels, and restores focus on Escape', async Component => {
  function Example() { const [open, setOpen] = useState(false); return <><button onClick={() => setOpen(true)}>Open</button><Component open={open} onClose={() => setOpen(false)} title="Edit workspace" description="Details"><Input label="Name" /></Component></>; }
  render(<Example />);
  const trigger = screen.getByRole('button', { name: 'Open' }); await userEvent.click(trigger);
  const dialog = screen.getByRole('dialog', { name: 'Edit workspace' });
  expect(dialog).toHaveAccessibleDescription('Details');
  expect(dialog).toHaveAttribute('dir', 'rtl');
  await userEvent.keyboard('{Tab}{Tab}{Tab}');
  expect(dialog.contains(document.activeElement)).toBe(true);
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('RTL tabs move focus and selection while skipping disabled tabs', async () => {
  function Example() { const [value, setValue] = useState('a'); return <Tabs value={value} onChange={setValue} tabs={[{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Blocked', disabled: true }, { value: 'c', label: 'Charlie' }]} />; }
  render(<Example />); screen.getByRole('tab', { name: 'Alpha' }).focus();
  await userEvent.keyboard('{ArrowLeft}');
  await waitFor(() => expect(screen.getByRole('tab', { name: 'Charlie' })).toHaveFocus());
  expect(screen.getByRole('tab', { name: 'Charlie' })).toHaveAttribute('aria-selected', 'true');
});

it('table sorting works from the keyboard and pagination clamps when rows shrink', async () => {
  const columns = [{ key: 'name', header: 'Name', accessor: r => r.name }];
  const { rerender } = render(<DataTable columns={columns} rows={[{ id: 1, name: 'Zed' }, { id: 2, name: 'Amy' }, { id: 3, name: 'Cat' }]} pageSize={1} />);
  screen.getByRole('button', { name: 'Name' }).focus(); await userEvent.keyboard('{Enter}');
  expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'ascending');
  expect(screen.getByText('Amy')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
  rerender(<DataTable columns={columns} rows={[{ id: 1, name: 'Zed' }]} pageSize={1} />);
  expect(screen.getByText('Zed')).toBeInTheDocument();
});

it('shared menu opens from the keyboard and invokes an item', async () => {
  const select = jest.fn();
  render(<DropdownMenu><DropdownMenuTrigger>Actions</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onSelect={select}>Edit</DropdownMenuItem></DropdownMenuContent></DropdownMenu>);
  screen.getByRole('button', { name: 'Actions' }).focus(); await userEvent.keyboard('{Enter}');
  await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus());
  await userEvent.keyboard('{Enter}'); expect(select).toHaveBeenCalled();
});

it('connects tabs to named panels when panel content is supplied', () => {
  render(<Tabs value="a" tabs={[{ value: 'a', label: 'Alpha' }]}><TabPanel value="a">Alpha content</TabPanel></Tabs>);
  const panel = screen.getByRole('tabpanel', { name: 'Alpha' });
  expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-controls', panel.id);
});
