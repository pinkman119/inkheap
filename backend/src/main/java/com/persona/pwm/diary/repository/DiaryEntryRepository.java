package com.persona.pwm.diary.repository;

import com.persona.pwm.diary.model.DiaryEntry;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DiaryEntryRepository extends JpaRepository<DiaryEntry, Long> {

    Optional<DiaryEntry> findByEntryDate(LocalDate entryDate);

    boolean existsByEntryDate(LocalDate entryDate);

    @Query("select e from DiaryEntry e where e.entryDate between :start and :end order by e.entryDate")
    List<DiaryEntry> findByMonthRange(LocalDate start, LocalDate end);

    default List<DiaryEntry> findByYearMonth(YearMonth yearMonth) {
        LocalDate start = yearMonth.atDay(1);
        LocalDate end = yearMonth.atEndOfMonth();
        return findByMonthRange(start, end);
    }

    @Query(
            "select distinct e from DiaryEntry e left join e.plans p " +
            "where lower(e.content) like lower(concat('%', :keyword, '%')) " +
            "or lower(e.mood) like lower(concat('%', :keyword, '%')) " +
            "or lower(p) like lower(concat('%', :keyword, '%')) " +
            "order by e.entryDate desc"
    )
    List<DiaryEntry> searchByKeyword(@Param("keyword") String keyword);
}
