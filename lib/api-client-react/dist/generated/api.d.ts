import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { AssignVolunteerRequest, AutoScheduleRequest, AutoScheduleResult, AvailabilitySlot, CreateAvailabilitySlotRequest, CreateSeasonRequest, CreateShiftRequest, CreateVolunteerRequest, CurrentUser, DeleteResponse, HealthStatus, ImportResult, ImportSeasonScheduleBody, ListShiftsParams, LoginRequest, LoginResponse, Season, ShiftWithAssignments, UpdateAvailabilitySlotRequest, UpdateShiftRequest, Volunteer } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List all availability slot options
 */
export declare const getListAvailabilitySlotsUrl: () => string;
export declare const listAvailabilitySlots: (options?: RequestInit) => Promise<AvailabilitySlot[]>;
export declare const getListAvailabilitySlotsQueryKey: () => readonly ["/api/availability-slots"];
export declare const getListAvailabilitySlotsQueryOptions: <TData = Awaited<ReturnType<typeof listAvailabilitySlots>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAvailabilitySlots>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAvailabilitySlots>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAvailabilitySlotsQueryResult = NonNullable<Awaited<ReturnType<typeof listAvailabilitySlots>>>;
export type ListAvailabilitySlotsQueryError = ErrorType<unknown>;
/**
 * @summary List all availability slot options
 */
export declare function useListAvailabilitySlots<TData = Awaited<ReturnType<typeof listAvailabilitySlots>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAvailabilitySlots>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a new availability slot
 */
export declare const getCreateAvailabilitySlotUrl: () => string;
export declare const createAvailabilitySlot: (createAvailabilitySlotRequest: CreateAvailabilitySlotRequest, options?: RequestInit) => Promise<AvailabilitySlot>;
export declare const getCreateAvailabilitySlotMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAvailabilitySlot>>, TError, {
        data: BodyType<CreateAvailabilitySlotRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createAvailabilitySlot>>, TError, {
    data: BodyType<CreateAvailabilitySlotRequest>;
}, TContext>;
export type CreateAvailabilitySlotMutationResult = NonNullable<Awaited<ReturnType<typeof createAvailabilitySlot>>>;
export type CreateAvailabilitySlotMutationBody = BodyType<CreateAvailabilitySlotRequest>;
export type CreateAvailabilitySlotMutationError = ErrorType<unknown>;
/**
 * @summary Create a new availability slot
 */
export declare const useCreateAvailabilitySlot: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAvailabilitySlot>>, TError, {
        data: BodyType<CreateAvailabilitySlotRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createAvailabilitySlot>>, TError, {
    data: BodyType<CreateAvailabilitySlotRequest>;
}, TContext>;
/**
 * @summary Update an availability slot
 */
export declare const getUpdateAvailabilitySlotUrl: (id: number) => string;
export declare const updateAvailabilitySlot: (id: number, updateAvailabilitySlotRequest: UpdateAvailabilitySlotRequest, options?: RequestInit) => Promise<AvailabilitySlot>;
export declare const getUpdateAvailabilitySlotMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAvailabilitySlot>>, TError, {
        id: number;
        data: BodyType<UpdateAvailabilitySlotRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateAvailabilitySlot>>, TError, {
    id: number;
    data: BodyType<UpdateAvailabilitySlotRequest>;
}, TContext>;
export type UpdateAvailabilitySlotMutationResult = NonNullable<Awaited<ReturnType<typeof updateAvailabilitySlot>>>;
export type UpdateAvailabilitySlotMutationBody = BodyType<UpdateAvailabilitySlotRequest>;
export type UpdateAvailabilitySlotMutationError = ErrorType<unknown>;
/**
 * @summary Update an availability slot
 */
export declare const useUpdateAvailabilitySlot: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAvailabilitySlot>>, TError, {
        id: number;
        data: BodyType<UpdateAvailabilitySlotRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateAvailabilitySlot>>, TError, {
    id: number;
    data: BodyType<UpdateAvailabilitySlotRequest>;
}, TContext>;
/**
 * @summary Delete an availability slot
 */
export declare const getDeleteAvailabilitySlotUrl: (id: number) => string;
export declare const deleteAvailabilitySlot: (id: number, options?: RequestInit) => Promise<DeleteResponse>;
export declare const getDeleteAvailabilitySlotMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAvailabilitySlot>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteAvailabilitySlot>>, TError, {
    id: number;
}, TContext>;
export type DeleteAvailabilitySlotMutationResult = NonNullable<Awaited<ReturnType<typeof deleteAvailabilitySlot>>>;
export type DeleteAvailabilitySlotMutationError = ErrorType<unknown>;
/**
 * @summary Delete an availability slot
 */
export declare const useDeleteAvailabilitySlot: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAvailabilitySlot>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteAvailabilitySlot>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List all seasons
 */
export declare const getListSeasonsUrl: () => string;
export declare const listSeasons: (options?: RequestInit) => Promise<Season[]>;
export declare const getListSeasonsQueryKey: () => readonly ["/api/seasons"];
export declare const getListSeasonsQueryOptions: <TData = Awaited<ReturnType<typeof listSeasons>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSeasons>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSeasons>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSeasonsQueryResult = NonNullable<Awaited<ReturnType<typeof listSeasons>>>;
export type ListSeasonsQueryError = ErrorType<unknown>;
/**
 * @summary List all seasons
 */
export declare function useListSeasons<TData = Awaited<ReturnType<typeof listSeasons>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSeasons>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a season
 */
export declare const getCreateSeasonUrl: () => string;
export declare const createSeason: (createSeasonRequest: CreateSeasonRequest, options?: RequestInit) => Promise<Season>;
export declare const getCreateSeasonMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSeason>>, TError, {
        data: BodyType<CreateSeasonRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createSeason>>, TError, {
    data: BodyType<CreateSeasonRequest>;
}, TContext>;
export type CreateSeasonMutationResult = NonNullable<Awaited<ReturnType<typeof createSeason>>>;
export type CreateSeasonMutationBody = BodyType<CreateSeasonRequest>;
export type CreateSeasonMutationError = ErrorType<unknown>;
/**
 * @summary Create a season
 */
export declare const useCreateSeason: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSeason>>, TError, {
        data: BodyType<CreateSeasonRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createSeason>>, TError, {
    data: BodyType<CreateSeasonRequest>;
}, TContext>;
/**
 * @summary Get a season by ID
 */
export declare const getGetSeasonUrl: (id: number) => string;
export declare const getSeason: (id: number, options?: RequestInit) => Promise<Season>;
export declare const getGetSeasonQueryKey: (id: number) => readonly [`/api/seasons/${number}`];
export declare const getGetSeasonQueryOptions: <TData = Awaited<ReturnType<typeof getSeason>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSeason>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSeason>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSeasonQueryResult = NonNullable<Awaited<ReturnType<typeof getSeason>>>;
export type GetSeasonQueryError = ErrorType<void>;
/**
 * @summary Get a season by ID
 */
export declare function useGetSeason<TData = Awaited<ReturnType<typeof getSeason>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSeason>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Delete a season
 */
export declare const getDeleteSeasonUrl: (id: number) => string;
export declare const deleteSeason: (id: number, options?: RequestInit) => Promise<DeleteResponse>;
export declare const getDeleteSeasonMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSeason>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteSeason>>, TError, {
    id: number;
}, TContext>;
export type DeleteSeasonMutationResult = NonNullable<Awaited<ReturnType<typeof deleteSeason>>>;
export type DeleteSeasonMutationError = ErrorType<unknown>;
/**
 * @summary Delete a season
 */
export declare const useDeleteSeason: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSeason>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteSeason>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Import shifts from xlsx file
 */
export declare const getImportSeasonScheduleUrl: (id: number) => string;
export declare const importSeasonSchedule: (id: number, importSeasonScheduleBody: ImportSeasonScheduleBody, options?: RequestInit) => Promise<ImportResult>;
export declare const getImportSeasonScheduleMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof importSeasonSchedule>>, TError, {
        id: number;
        data: BodyType<ImportSeasonScheduleBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof importSeasonSchedule>>, TError, {
    id: number;
    data: BodyType<ImportSeasonScheduleBody>;
}, TContext>;
export type ImportSeasonScheduleMutationResult = NonNullable<Awaited<ReturnType<typeof importSeasonSchedule>>>;
export type ImportSeasonScheduleMutationBody = BodyType<ImportSeasonScheduleBody>;
export type ImportSeasonScheduleMutationError = ErrorType<unknown>;
/**
 * @summary Import shifts from xlsx file
 */
export declare const useImportSeasonSchedule: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof importSeasonSchedule>>, TError, {
        id: number;
        data: BodyType<ImportSeasonScheduleBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof importSeasonSchedule>>, TError, {
    id: number;
    data: BodyType<ImportSeasonScheduleBody>;
}, TContext>;
/**
 * @summary List all volunteers
 */
export declare const getListVolunteersUrl: () => string;
export declare const listVolunteers: (options?: RequestInit) => Promise<Volunteer[]>;
export declare const getListVolunteersQueryKey: () => readonly ["/api/volunteers"];
export declare const getListVolunteersQueryOptions: <TData = Awaited<ReturnType<typeof listVolunteers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listVolunteers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listVolunteers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListVolunteersQueryResult = NonNullable<Awaited<ReturnType<typeof listVolunteers>>>;
export type ListVolunteersQueryError = ErrorType<unknown>;
/**
 * @summary List all volunteers
 */
export declare function useListVolunteers<TData = Awaited<ReturnType<typeof listVolunteers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listVolunteers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a volunteer
 */
export declare const getCreateVolunteerUrl: () => string;
export declare const createVolunteer: (createVolunteerRequest: CreateVolunteerRequest, options?: RequestInit) => Promise<Volunteer>;
export declare const getCreateVolunteerMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createVolunteer>>, TError, {
        data: BodyType<CreateVolunteerRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createVolunteer>>, TError, {
    data: BodyType<CreateVolunteerRequest>;
}, TContext>;
export type CreateVolunteerMutationResult = NonNullable<Awaited<ReturnType<typeof createVolunteer>>>;
export type CreateVolunteerMutationBody = BodyType<CreateVolunteerRequest>;
export type CreateVolunteerMutationError = ErrorType<unknown>;
/**
 * @summary Create a volunteer
 */
export declare const useCreateVolunteer: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createVolunteer>>, TError, {
        data: BodyType<CreateVolunteerRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createVolunteer>>, TError, {
    data: BodyType<CreateVolunteerRequest>;
}, TContext>;
/**
 * @summary Get a volunteer by ID
 */
export declare const getGetVolunteerUrl: (id: number) => string;
export declare const getVolunteer: (id: number, options?: RequestInit) => Promise<Volunteer>;
export declare const getGetVolunteerQueryKey: (id: number) => readonly [`/api/volunteers/${number}`];
export declare const getGetVolunteerQueryOptions: <TData = Awaited<ReturnType<typeof getVolunteer>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getVolunteer>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getVolunteer>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetVolunteerQueryResult = NonNullable<Awaited<ReturnType<typeof getVolunteer>>>;
export type GetVolunteerQueryError = ErrorType<void>;
/**
 * @summary Get a volunteer by ID
 */
export declare function useGetVolunteer<TData = Awaited<ReturnType<typeof getVolunteer>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getVolunteer>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update a volunteer
 */
export declare const getUpdateVolunteerUrl: (id: number) => string;
export declare const updateVolunteer: (id: number, createVolunteerRequest: CreateVolunteerRequest, options?: RequestInit) => Promise<Volunteer>;
export declare const getUpdateVolunteerMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateVolunteer>>, TError, {
        id: number;
        data: BodyType<CreateVolunteerRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateVolunteer>>, TError, {
    id: number;
    data: BodyType<CreateVolunteerRequest>;
}, TContext>;
export type UpdateVolunteerMutationResult = NonNullable<Awaited<ReturnType<typeof updateVolunteer>>>;
export type UpdateVolunteerMutationBody = BodyType<CreateVolunteerRequest>;
export type UpdateVolunteerMutationError = ErrorType<unknown>;
/**
 * @summary Update a volunteer
 */
export declare const useUpdateVolunteer: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateVolunteer>>, TError, {
        id: number;
        data: BodyType<CreateVolunteerRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateVolunteer>>, TError, {
    id: number;
    data: BodyType<CreateVolunteerRequest>;
}, TContext>;
/**
 * @summary Delete a volunteer
 */
export declare const getDeleteVolunteerUrl: (id: number) => string;
export declare const deleteVolunteer: (id: number, options?: RequestInit) => Promise<DeleteResponse>;
export declare const getDeleteVolunteerMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteVolunteer>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteVolunteer>>, TError, {
    id: number;
}, TContext>;
export type DeleteVolunteerMutationResult = NonNullable<Awaited<ReturnType<typeof deleteVolunteer>>>;
export type DeleteVolunteerMutationError = ErrorType<unknown>;
/**
 * @summary Delete a volunteer
 */
export declare const useDeleteVolunteer: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteVolunteer>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteVolunteer>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List all shifts
 */
export declare const getListShiftsUrl: (params?: ListShiftsParams) => string;
export declare const listShifts: (params?: ListShiftsParams, options?: RequestInit) => Promise<ShiftWithAssignments[]>;
export declare const getListShiftsQueryKey: (params?: ListShiftsParams) => readonly ["/api/shifts", ...ListShiftsParams[]];
export declare const getListShiftsQueryOptions: <TData = Awaited<ReturnType<typeof listShifts>>, TError = ErrorType<unknown>>(params?: ListShiftsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listShifts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listShifts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListShiftsQueryResult = NonNullable<Awaited<ReturnType<typeof listShifts>>>;
export type ListShiftsQueryError = ErrorType<unknown>;
/**
 * @summary List all shifts
 */
export declare function useListShifts<TData = Awaited<ReturnType<typeof listShifts>>, TError = ErrorType<unknown>>(params?: ListShiftsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listShifts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a shift
 */
export declare const getCreateShiftUrl: () => string;
export declare const createShift: (createShiftRequest: CreateShiftRequest, options?: RequestInit) => Promise<ShiftWithAssignments>;
export declare const getCreateShiftMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createShift>>, TError, {
        data: BodyType<CreateShiftRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createShift>>, TError, {
    data: BodyType<CreateShiftRequest>;
}, TContext>;
export type CreateShiftMutationResult = NonNullable<Awaited<ReturnType<typeof createShift>>>;
export type CreateShiftMutationBody = BodyType<CreateShiftRequest>;
export type CreateShiftMutationError = ErrorType<unknown>;
/**
 * @summary Create a shift
 */
export declare const useCreateShift: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createShift>>, TError, {
        data: BodyType<CreateShiftRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createShift>>, TError, {
    data: BodyType<CreateShiftRequest>;
}, TContext>;
/**
 * @summary Get a shift by ID
 */
export declare const getGetShiftUrl: (id: number) => string;
export declare const getShift: (id: number, options?: RequestInit) => Promise<ShiftWithAssignments>;
export declare const getGetShiftQueryKey: (id: number) => readonly [`/api/shifts/${number}`];
export declare const getGetShiftQueryOptions: <TData = Awaited<ReturnType<typeof getShift>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getShift>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getShift>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetShiftQueryResult = NonNullable<Awaited<ReturnType<typeof getShift>>>;
export type GetShiftQueryError = ErrorType<void>;
/**
 * @summary Get a shift by ID
 */
export declare function useGetShift<TData = Awaited<ReturnType<typeof getShift>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getShift>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update a shift
 */
export declare const getUpdateShiftUrl: (id: number) => string;
export declare const updateShift: (id: number, updateShiftRequest: UpdateShiftRequest, options?: RequestInit) => Promise<ShiftWithAssignments>;
export declare const getUpdateShiftMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateShift>>, TError, {
        id: number;
        data: BodyType<UpdateShiftRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateShift>>, TError, {
    id: number;
    data: BodyType<UpdateShiftRequest>;
}, TContext>;
export type UpdateShiftMutationResult = NonNullable<Awaited<ReturnType<typeof updateShift>>>;
export type UpdateShiftMutationBody = BodyType<UpdateShiftRequest>;
export type UpdateShiftMutationError = ErrorType<unknown>;
/**
 * @summary Update a shift
 */
export declare const useUpdateShift: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateShift>>, TError, {
        id: number;
        data: BodyType<UpdateShiftRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateShift>>, TError, {
    id: number;
    data: BodyType<UpdateShiftRequest>;
}, TContext>;
/**
 * @summary Delete a shift
 */
export declare const getDeleteShiftUrl: (id: number) => string;
export declare const deleteShift: (id: number, options?: RequestInit) => Promise<DeleteResponse>;
export declare const getDeleteShiftMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteShift>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteShift>>, TError, {
    id: number;
}, TContext>;
export type DeleteShiftMutationResult = NonNullable<Awaited<ReturnType<typeof deleteShift>>>;
export type DeleteShiftMutationError = ErrorType<unknown>;
/**
 * @summary Delete a shift
 */
export declare const useDeleteShift: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteShift>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteShift>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Automatically distribute volunteers across shifts
 */
export declare const getAutoScheduleUrl: () => string;
export declare const autoSchedule: (autoScheduleRequest: AutoScheduleRequest, options?: RequestInit) => Promise<AutoScheduleResult>;
export declare const getAutoScheduleMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof autoSchedule>>, TError, {
        data: BodyType<AutoScheduleRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof autoSchedule>>, TError, {
    data: BodyType<AutoScheduleRequest>;
}, TContext>;
export type AutoScheduleMutationResult = NonNullable<Awaited<ReturnType<typeof autoSchedule>>>;
export type AutoScheduleMutationBody = BodyType<AutoScheduleRequest>;
export type AutoScheduleMutationError = ErrorType<unknown>;
/**
 * @summary Automatically distribute volunteers across shifts
 */
export declare const useAutoSchedule: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof autoSchedule>>, TError, {
        data: BodyType<AutoScheduleRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof autoSchedule>>, TError, {
    data: BodyType<AutoScheduleRequest>;
}, TContext>;
/**
 * @summary Assign a volunteer to a shift
 */
export declare const getAssignVolunteerUrl: (id: number) => string;
export declare const assignVolunteer: (id: number, assignVolunteerRequest: AssignVolunteerRequest, options?: RequestInit) => Promise<ShiftWithAssignments>;
export declare const getAssignVolunteerMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof assignVolunteer>>, TError, {
        id: number;
        data: BodyType<AssignVolunteerRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof assignVolunteer>>, TError, {
    id: number;
    data: BodyType<AssignVolunteerRequest>;
}, TContext>;
export type AssignVolunteerMutationResult = NonNullable<Awaited<ReturnType<typeof assignVolunteer>>>;
export type AssignVolunteerMutationBody = BodyType<AssignVolunteerRequest>;
export type AssignVolunteerMutationError = ErrorType<unknown>;
/**
 * @summary Assign a volunteer to a shift
 */
export declare const useAssignVolunteer: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof assignVolunteer>>, TError, {
        id: number;
        data: BodyType<AssignVolunteerRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof assignVolunteer>>, TError, {
    id: number;
    data: BodyType<AssignVolunteerRequest>;
}, TContext>;
/**
 * @summary Remove a volunteer from a shift
 */
export declare const getUnassignVolunteerUrl: (id: number, volunteerId: number) => string;
export declare const unassignVolunteer: (id: number, volunteerId: number, options?: RequestInit) => Promise<ShiftWithAssignments>;
export declare const getUnassignVolunteerMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof unassignVolunteer>>, TError, {
        id: number;
        volunteerId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof unassignVolunteer>>, TError, {
    id: number;
    volunteerId: number;
}, TContext>;
export type UnassignVolunteerMutationResult = NonNullable<Awaited<ReturnType<typeof unassignVolunteer>>>;
export type UnassignVolunteerMutationError = ErrorType<unknown>;
/**
 * @summary Remove a volunteer from a shift
 */
export declare const useUnassignVolunteer: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof unassignVolunteer>>, TError, {
        id: number;
        volunteerId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof unassignVolunteer>>, TError, {
    id: number;
    volunteerId: number;
}, TContext>;
/**
 * @summary Login
 */
export declare const getLoginUrl: () => string;
export declare const login: (loginRequest: LoginRequest, options?: RequestInit) => Promise<LoginResponse>;
export declare const getLoginMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
        data: BodyType<LoginRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
    data: BodyType<LoginRequest>;
}, TContext>;
export type LoginMutationResult = NonNullable<Awaited<ReturnType<typeof login>>>;
export type LoginMutationBody = BodyType<LoginRequest>;
export type LoginMutationError = ErrorType<void>;
/**
 * @summary Login
 */
export declare const useLogin: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
        data: BodyType<LoginRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof login>>, TError, {
    data: BodyType<LoginRequest>;
}, TContext>;
/**
 * @summary Get current user
 */
export declare const getGetMeUrl: () => string;
export declare const getMe: (options?: RequestInit) => Promise<CurrentUser>;
export declare const getGetMeQueryKey: () => readonly ["/api/auth/me"];
export declare const getGetMeQueryOptions: <TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMeQueryResult = NonNullable<Awaited<ReturnType<typeof getMe>>>;
export type GetMeQueryError = ErrorType<void>;
/**
 * @summary Get current user
 */
export declare function useGetMe<TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Logout
 */
export declare const getLogoutUrl: () => string;
export declare const logout: (options?: RequestInit) => Promise<DeleteResponse>;
export declare const getLogoutMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
export type LogoutMutationResult = NonNullable<Awaited<ReturnType<typeof logout>>>;
export type LogoutMutationError = ErrorType<unknown>;
/**
 * @summary Logout
 */
export declare const useLogout: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map