import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  currentTripId: string | null;
}

const initialState: UIState = {
  currentTripId: 'trip-1'
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setCurrentTripId(state, action: PayloadAction<string>) {
      state.currentTripId = action.payload;
    }
  }
});

export const { setCurrentTripId } = uiSlice.actions;
export default uiSlice.reducer;
