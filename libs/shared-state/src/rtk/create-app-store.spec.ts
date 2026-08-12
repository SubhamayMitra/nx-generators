import { createSlice } from '@reduxjs/toolkit';
import { createAppStore } from './create-app-store.js';

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    incremented: (state) => {
      state.value += 1;
    },
  },
});

describe('createAppStore', () => {
  it('builds an independent store from the reducers it is given', () => {
    const store = createAppStore({
      reducer: { counter: counterSlice.reducer },
    });

    expect(store.getState().counter.value).toBe(0);
    store.dispatch(counterSlice.actions.incremented());
    expect(store.getState().counter.value).toBe(1);
  });

  it('produces a distinct store per call, so two MFEs never share state', () => {
    const storeA = createAppStore({
      reducer: { counter: counterSlice.reducer },
    });
    const storeB = createAppStore({
      reducer: { counter: counterSlice.reducer },
    });

    storeA.dispatch(counterSlice.actions.incremented());
    expect(storeA.getState().counter.value).toBe(1);
    expect(storeB.getState().counter.value).toBe(0);
  });
});
