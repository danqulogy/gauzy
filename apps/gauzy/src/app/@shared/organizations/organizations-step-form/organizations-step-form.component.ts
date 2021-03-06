import * as moment from 'moment';
import * as timezone from 'moment-timezone';
import { formatDate } from '@angular/common';
import {
	Component,
	EventEmitter,
	OnDestroy,
	OnInit,
	Output,
	ViewChild
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
	BonusTypeEnum,
	ICountry,
	CurrenciesEnum,
	DefaultValueDateTypeEnum,
	RegionsEnum,
	WeekDaysEnum,
	ITag,
	ICurrency
} from '@gauzy/models';
import { NbToastrService } from '@nebular/theme';
import { LocationFormComponent } from '../../forms/location';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { LatLng } from 'leaflet';
import { LeafletMapComponent } from '../../forms/maps/leaflet/leaflet.component';

@UntilDestroy({ checkProperties: true })
@Component({
	selector: 'ga-organizations-step-form',
	templateUrl: './organizations-step-form.component.html',
	styleUrls: [
		'./organizations-step-form.component.scss',
		'../../../@shared/user/edit-profile-form/edit-profile-form.component.scss'
	]
})
export class OrganizationsStepFormComponent implements OnInit, OnDestroy {
	@ViewChild('locationFormDirective')
	locationFormDirective: LocationFormComponent;

	@ViewChild('leafletTemplate')
	leafletTemplate: LeafletMapComponent;

	readonly locationForm: FormGroup = LocationFormComponent.buildForm(this.fb);

	hoverState: boolean;
	currencies: string[] = Object.values(CurrenciesEnum);
	countries: ICountry[];
	defaultValueDateTypes: string[] = Object.values(DefaultValueDateTypeEnum);
	defaultBonusTypes: string[] = Object.values(BonusTypeEnum);
	listOfZones = timezone.tz.names().filter((zone) => zone.includes('/'));
	weekdays: string[] = Object.values(WeekDaysEnum);
	regionCodes = Object.keys(RegionsEnum);
	regionCode: string;
	numberFormats = ['USD', 'BGN', 'ILS'];
	listOfDateFormats = ['L', 'L hh:mm', 'LL', 'LLL', 'LLLL'];

	orgMainForm: FormGroup;
	orgBonusForm: FormGroup;
	orgSettingsForm: FormGroup;
	tags: ITag[] = [];
	currency: ICurrency;
	country: ICountry;

	@Output()
	createOrganization = new EventEmitter();

	constructor(
		private fb: FormBuilder,
		private toastrService: NbToastrService
	) {}

	async ngOnInit() {
		this._initializedForm();
	}

	private _initializedForm() {
		this.orgMainForm = this.fb.group({
			imageUrl: [
				'https://dummyimage.com/330x300/8b72ff/ffffff.jpg&text',
				Validators.required
			],
			currency: ['', Validators.required],
			name: ['', Validators.required],
			officialName: [],
			taxId: [],
			tags: []
		});
		this.orgBonusForm = this.fb.group({
			bonusType: [],
			bonusPercentage: ['', [Validators.min(0), Validators.max(100)]]
		});
		this.orgSettingsForm = this.fb.group({
			timeZone: [],
			startWeekOn: [],
			defaultValueDateType: [
				DefaultValueDateTypeEnum.TODAY,
				Validators.required
			],
			regionCode: [],
			numberFormat: [],
			dateFormat: [],
			fiscalStartDate: [
				formatDate(
					new Date(`01/01/${new Date().getFullYear()}`),
					'yyyy-MM-dd',
					'en'
				)
			],
			fiscalEndDate: [
				formatDate(
					new Date(`12/31/${new Date().getFullYear()}`),
					'yyyy-MM-dd',
					'en'
				)
			],
			invitesAllowed: [true],
			inviteExpiryPeriod: [7, [Validators.min(1)]]
		});
	}

	handleImageUploadError(error) {
		this.toastrService.danger(error, 'Error');
	}

	loadDefaultBonusPercentage(bonusType: BonusTypeEnum) {
		const bonusPercentageControl = this.orgBonusForm.get('bonusPercentage');
		switch (bonusType) {
			case BonusTypeEnum.PROFIT_BASED_BONUS:
				bonusPercentageControl.setValue(75);
				bonusPercentageControl.enable();
				break;
			case BonusTypeEnum.REVENUE_BASED_BONUS:
				bonusPercentageControl.setValue(10);
				bonusPercentageControl.enable();
				break;
			default:
				bonusPercentageControl.setValue(null);
				bonusPercentageControl.disable();
				break;
		}
	}
	toggleExpiry(checked) {
		const inviteExpiryControl = this.orgBonusForm.get('inviteExpiryPeriod');
		checked ? inviteExpiryControl.enable() : inviteExpiryControl.disable();
	}

	numberFormatPreview(format: string) {
		const number = 12345.67;
		let code: string;
		switch (format) {
			case 'BGN':
				code = 'bg';
				break;
			case 'USD':
				code = 'en';
				break;
			case 'ILS':
				code = 'he';
				break;
		}
		return number.toLocaleString(`${code}`, {
			style: 'currency',
			currency: `${format}`,
			currencyDisplay: 'symbol'
		});
	}

	dateFormatPreview(format: string) {
		this.orgSettingsForm.valueChanges
			.pipe(untilDestroyed(this))
			.subscribe((val) => {
				this.regionCode = val.regionCode;
			});

		moment.locale(this.regionCode);
		return moment().format(format);
	}

	getTimeWithOffset(zone: string) {
		let cutZone = zone;
		if (zone.includes('/')) {
			cutZone = zone.split('/')[1];
		}

		const offset = timezone.tz(zone).format('zZ');

		return '(' + offset + ') ' + cutZone;
	}

	addOrganization() {
		const location = this.locationFormDirective.getValue();
		const { coordinates } = location['loc'];
		delete location['loc'];

		const [latitude, longitude] = coordinates;
		const contact = {
			...location,
			...{ latitude, longitude }
		};

		const consolidatedFormValues = {
			...this.orgMainForm.value,
			contact,
			...this.orgBonusForm.value,
			...this.orgSettingsForm.value
		};
		this.createOrganization.emit(consolidatedFormValues);
	}

	selectedTagsEvent(currentSelection: ITag[]) {
		this.orgMainForm.get('tags').setValue(currentSelection);
	}

	/*
	 * On Changed Currency Event Emitter
	 */
	currencyChanged($event: ICurrency) {}

	/*
	 * Google Place and Leaflet Map Coordinates Changed Event Emitter
	 */
	onCoordinatesChanges(
		$event: google.maps.LatLng | google.maps.LatLngLiteral
	) {
		const {
			loc: { coordinates }
		} = this.locationFormDirective.getValue();
		const [lat, lng] = coordinates;
		this.leafletTemplate.addMarker(new LatLng(lat, lng));
	}

	/*
	 * Leaflet Map Click Event Emitter
	 */
	onMapClicked(latlng: LatLng) {
		const { lat, lng }: LatLng = latlng;
		const location = this.locationFormDirective.getValue();
		this.locationFormDirective.setValue({
			...location,
			country: '',
			loc: {
				type: 'Point',
				coordinates: [lat, lng]
			}
		});
		this.locationFormDirective.onCoordinatesChanged();
	}

	/*
	 * Google Place Geometry Changed Event Emitter
	 */
	onGeometrySend(geometry: any) {}

	ngOnDestroy() {}
}
