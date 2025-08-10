import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  menuOpen: boolean;
  backendOnline: boolean | null;
  currentTripId: string | null;
  showAiPanel: boolean;
}

const initialState: UIState = {
  menuOpen: false,
  backendOnline: null,
  currentTripId: null,
  showAiPanel: false
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setMenuOpen(state, action: PayloadAction<boolean>) {
      state.menuOpen = action.payload;
    },
    toggleMenu(state) {
      state.menuOpen = !state.menuOpen;
    },
    setBackendOnline(state, action: PayloadAction<boolean>) {
      state.backendOnline = action.payload;
    },
    setCurrentTripId(state, action: PayloadAction<string | null>) {
      state.currentTripId = action.payload;
    },
    setShowAiPanel(state, action: PayloadAction<boolean>) {
      state.showAiPanel = action.payload;
    },
    toggleShowAiPanel(state) {
      state.showAiPanel = !state.showAiPanel;
    }
  }
});

export const {
  setMenuOpen,
  toggleMenu,
  setBackendOnline,
  setCurrentTripId,
  setShowAiPanel,
  toggleShowAiPanel
} = uiSlice.actions;
export default uiSlice.reducer;
