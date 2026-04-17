vi.mock('../../../src/client/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from '../../../src/client/api/client';
import {
  fetchBoardsApi,
  fetchBoardApi,
  createBoardApi,
  updateBoardApi,
  deleteBoardApi,
} from '../../../src/client/api/boards';
import {
  createCardApi,
  fetchCardApi,
  updateCardApi,
  deleteCardApi,
} from '../../../src/client/api/cards';
import {
  createListApi,
  updateListApi,
  deleteListApi,
} from '../../../src/client/api/lists';
import { loginApi, registerApi } from '../../../src/client/api/auth';
import {
  fetchBoardLabelsApi,
  createLabelApi,
  updateLabelApi,
  deleteLabelApi,
  attachLabelApi,
  detachLabelApi,
} from '../../../src/client/api/labels';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.get).mockResolvedValue({ data: null as never });
  vi.mocked(apiClient.post).mockResolvedValue({ data: null as never });
  vi.mocked(apiClient.patch).mockResolvedValue({ data: null as never });
  vi.mocked(apiClient.delete).mockResolvedValue({ data: undefined as never });
});

describe('boards api wrappers', () => {
  it('fetchBoardsApi', async () => {
    await fetchBoardsApi();
    expect(apiClient.get).toHaveBeenCalledWith('/api/boards');
  });

  it('fetchBoardApi', async () => {
    await fetchBoardApi('id-1');
    expect(apiClient.get).toHaveBeenCalledWith('/api/boards/id-1');
  });

  it('createBoardApi sends name in body', async () => {
    await createBoardApi('New');
    expect(apiClient.post).toHaveBeenCalledWith('/api/boards', { name: 'New' });
  });

  it('updateBoardApi', async () => {
    await updateBoardApi('id-1', 'Rename');
    expect(apiClient.patch).toHaveBeenCalledWith('/api/boards/id-1', { name: 'Rename' });
  });

  it('deleteBoardApi', async () => {
    await deleteBoardApi('id-1');
    expect(apiClient.delete).toHaveBeenCalledWith('/api/boards/id-1');
  });
});

describe('cards api wrappers', () => {
  it('createCardApi', async () => {
    await createCardApi('list-1', { title: 'T', description: 'D' });
    expect(apiClient.post).toHaveBeenCalledWith('/api/lists/list-1/cards', {
      title: 'T',
      description: 'D',
    });
  });

  it('fetchCardApi', async () => {
    await fetchCardApi('card-1');
    expect(apiClient.get).toHaveBeenCalledWith('/api/cards/card-1');
  });

  it('updateCardApi', async () => {
    await updateCardApi('card-1', { title: 'x' });
    expect(apiClient.patch).toHaveBeenCalledWith('/api/cards/card-1', { title: 'x' });
  });

  it('deleteCardApi', async () => {
    await deleteCardApi('card-1');
    expect(apiClient.delete).toHaveBeenCalledWith('/api/cards/card-1');
  });
});

describe('lists api wrappers', () => {
  it('createListApi', async () => {
    await createListApi('board-1', 'Todo');
    expect(apiClient.post).toHaveBeenCalledWith('/api/boards/board-1/lists', { name: 'Todo' });
  });

  it('updateListApi', async () => {
    await updateListApi('list-1', { position: 2 });
    expect(apiClient.patch).toHaveBeenCalledWith('/api/lists/list-1', { position: 2 });
  });

  it('deleteListApi', async () => {
    await deleteListApi('list-1');
    expect(apiClient.delete).toHaveBeenCalledWith('/api/lists/list-1');
  });
});

describe('auth api wrappers', () => {
  it('loginApi', async () => {
    await loginApi('a@b.com', 'pw');
    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/login', {
      email: 'a@b.com',
      password: 'pw',
    });
  });

  it('registerApi', async () => {
    await registerApi('a@b.com', 'Alice', 'pw');
    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/register', {
      email: 'a@b.com',
      name: 'Alice',
      password: 'pw',
    });
  });
});

describe('labels api wrappers', () => {
  it('fetchBoardLabelsApi', async () => {
    await fetchBoardLabelsApi('board-1');
    expect(apiClient.get).toHaveBeenCalledWith('/api/boards/board-1/labels');
  });

  it('createLabelApi', async () => {
    await createLabelApi('board-1', { name: 'Bug', color: 'red' });
    expect(apiClient.post).toHaveBeenCalledWith('/api/boards/board-1/labels', {
      name: 'Bug',
      color: 'red',
    });
  });

  it('updateLabelApi', async () => {
    await updateLabelApi('label-1', { name: 'Defect' });
    expect(apiClient.patch).toHaveBeenCalledWith('/api/labels/label-1', { name: 'Defect' });
  });

  it('deleteLabelApi', async () => {
    await deleteLabelApi('label-1');
    expect(apiClient.delete).toHaveBeenCalledWith('/api/labels/label-1');
  });

  it('attachLabelApi', async () => {
    await attachLabelApi('card-1', 'label-1');
    expect(apiClient.post).toHaveBeenCalledWith('/api/cards/card-1/labels', {
      labelId: 'label-1',
    });
  });

  it('detachLabelApi', async () => {
    await detachLabelApi('card-1', 'label-1');
    expect(apiClient.delete).toHaveBeenCalledWith('/api/cards/card-1/labels/label-1');
  });
});
