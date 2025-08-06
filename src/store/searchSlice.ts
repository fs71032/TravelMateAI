import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SearchFiltersState {
  query: string;
  useFts: boolean;
  status: string;
  category: string;
  dateFrom: string;
  dateTo: string;
  bookingsSort: string;
  destinationsSort: string;
}

const initialState: SearchFiltersState = {
  query: '',
  useFts: false,
  status: '',
  category: '',
  dateFrom: '',
  dateTo: '',
  bookingsSort: 'date:desc',
  destinationsSort: 'name:asc'
};

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setSearchQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    setSearchUseFts(state, action: PayloadAction<boolean>) {
      state.useFts = action.payload;
    },
    setSearchStatus(state, action: PayloadAction<string>) {
      state.status = action.payload;
    },
    setSearchCategory(state, action: PayloadAction<string>) {
      state.category = action.payload;
    },
    setSearchDateFrom(state, action: PayloadAction<string>) {
      state.dateFrom = action.payload;
    },
    setSearchDateTo(state, action: PayloadAction<string>) {
      state.dateTo = action.payload;
    },
    setBookingsSort(state, action: PayloadAction<string>) {
      state.bookingsSort = action.payload;
    },
    setDestinationsSort(state, action: PayloadAction<string>) {
      state.destinationsSort = action.payload;
    },
    patchSearchFilters(state, action: PayloadAction<Partial<SearchFiltersState>>) {
      Object.assign(state, action.payload);
    }
  }
});

export const {
  setSearchQuery,
  setSearchUseFts,
  setSearchStatus,
  setSearchCategory,
  setSearchDateFrom,
  setSearchDateTo,
  setBookingsSort,
  setDestinationsSort,
  patchSearchFilters
} = searchSlice.actions;

export default searchSlice.reducer;
